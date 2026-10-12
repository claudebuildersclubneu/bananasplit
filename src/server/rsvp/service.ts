import { randomInt } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { placeRegistration, promotableCount, type ClosedReason } from "@/lib/rsvp/format";
import { enqueueJob } from "@/server/jobs/enqueue";

/**
 * Public RSVP pages: sign-ups, the waitlist and reminders
 * (docs/features/rsvp.md). Every function runs in the caller's transaction:
 * the public page's service transaction (withSystemOrgTx, the event's org)
 * or an owner/admin's own (withOrgTx; RLS lets only them touch sign-ups).
 *
 * Anything that counts spots first takes the event's advisory lock, so two
 * people pressing Register for the last spot can't both get it; the loser
 * lands on the waitlist (or is told it's full).
 */

type Db = Prisma.TransactionClient;

/** What the rules need from the event. */
export const RSVP_RULES_SELECT = {
  id: true,
  organizationId: true,
  startsAt: true,
  endsAt: true,
  deletedAt: true,
  rsvpEnabled: true,
  rsvpSlug: true,
  rsvpCapacity: true,
  rsvpWaitlist: true,
  rsvpClosed: true,
} satisfies Prisma.EventSelect;

export type RsvpRulesEvent = Prisma.EventGetPayload<{ select: typeof RSVP_RULES_SELECT }>;

export type RsvpEmailTemplate =
  "registered" | "waitlisted" | "promoted" | "reminder-day" | "reminder-hour" | "event-cancelled";

/** Serializes everything that counts this event's spots, until commit. */
export async function lockEvent(db: Db, eventId: string): Promise<void> {
  // $executeRaw: the function returns void, which $queryRaw can't read back.
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`rsvp:${eventId}`}, 0))`;
}

export async function registrationCounts(
  db: Db,
  organizationId: string,
  eventId: string,
): Promise<{ going: number; waitlist: number }> {
  const rows = await db.eventRegistration.groupBy({
    by: ["status"],
    where: { organizationId, eventId, status: { in: ["GOING", "WAITLIST"] } },
    _count: { _all: true },
  });
  const of = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
  return { going: of("GOING"), waitlist: of("WAITLIST") };
}

export async function enqueueRsvpEmail(
  db: Db,
  organizationId: string,
  registrationId: string,
  template: RsvpEmailTemplate,
  options: { startsAt?: Date; dedupe?: string } = {},
): Promise<void> {
  const stamp = options.startsAt ? `:${Math.floor(options.startsAt.getTime() / 60_000)}` : "";
  await enqueueJob(db, {
    orgId: organizationId,
    kind: "rsvp-email",
    key: `${registrationId}:${template}${stamp}${options.dedupe ? `:${options.dedupe}` : ""}`,
    payload: {
      registrationId,
      template,
      ...(options.startsAt ? { startsAt: options.startsAt.toISOString() } : {}),
    },
  });
}

export type RegisterOutcome =
  | { kind: "registered"; registrationId: string; status: "GOING" | "WAITLIST" }
  /** That email already has a live sign-up: we email its owner, not the visitor. */
  | { kind: "exists" }
  | { kind: "closed"; reason: ClosedReason | "off" };

/**
 * A sign-up from the public page (or an admin's "Add guest"). An email
 * that cancelled before signs up again on the same row; one that's still
 * signed up gets its confirmation re-sent (at most hourly), and the visitor
 * is only told to check that inbox, so typing someone else's email reveals
 * nothing and takes nothing over.
 */
export async function registerGuest(
  db: Db,
  event: RsvpRulesEvent,
  guest: { name: string; email: string; phone: string; userId?: string | null },
  options: { now?: Date; force?: boolean } = {},
): Promise<RegisterOutcome> {
  const now = options.now ?? new Date();
  if (!event.rsvpEnabled || event.deletedAt) return { kind: "closed", reason: "off" };
  await lockEvent(db, event.id);

  const existing = await db.eventRegistration.findUnique({
    where: { eventId_email: { eventId: event.id, email: guest.email } },
    select: { id: true, status: true },
  });
  if (existing && existing.status !== "CANCELLED") {
    await enqueueRsvpEmail(
      db,
      event.organizationId,
      existing.id,
      existing.status === "GOING" ? "registered" : "waitlisted",
      { dedupe: `again-${now.toISOString().slice(0, 13).replace(/\D/g, "")}` },
    );
    return { kind: "exists" };
  }

  const { going } = await registrationCounts(db, event.organizationId, event.id);
  const placed = options.force
    ? ({ status: "GOING" } as const)
    : placeRegistration(
        { capacity: event.rsvpCapacity, waitlist: event.rsvpWaitlist, closed: event.rsvpClosed },
        going,
        event.endsAt <= now,
      );
  if ("closed" in placed) return { kind: "closed", reason: placed.closed };

  const data = {
    name: guest.name,
    phone: guest.phone,
    status: placed.status,
    userId: guest.userId ?? null,
    cancelledAt: null,
    checkedInAt: null,
    reminderDaySentAt: null,
    reminderHourSentAt: null,
  };
  const row = existing
    ? await db.eventRegistration.update({ where: { id: existing.id }, data, select: { id: true } })
    : await db.eventRegistration.create({
        data: {
          ...data,
          organizationId: event.organizationId,
          eventId: event.id,
          email: guest.email,
        },
        select: { id: true },
      });
  await enqueueRsvpEmail(
    db,
    event.organizationId,
    row.id,
    placed.status === "GOING" ? "registered" : "waitlisted",
    { dedupe: now.getTime().toString(36) },
  );
  return { kind: "registered", registrationId: row.id, status: placed.status };
}

/**
 * Moves the earliest waitlisted guests into open spots (all of them when
 * the event is unlimited) and emails each "you're in". Call under the
 * event's lock, after anything that frees a spot or adds capacity.
 */
export async function promoteFromWaitlist(db: Db, event: RsvpRulesEvent): Promise<number> {
  const { going, waitlist } = await registrationCounts(db, event.organizationId, event.id);
  const n = event.endsAt <= new Date() ? 0 : promotableCount(event.rsvpCapacity, going, waitlist);
  if (n === 0) return 0;
  const next = await db.eventRegistration.findMany({
    where: { organizationId: event.organizationId, eventId: event.id, status: "WAITLIST" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: n,
    select: { id: true },
  });
  for (const r of next) {
    await db.eventRegistration.update({ where: { id: r.id }, data: { status: "GOING" } });
    await enqueueRsvpEmail(db, event.organizationId, r.id, "promoted");
  }
  return next.length;
}

/**
 * Sets a sign-up's status (the guest cancelling, or an admin moving them).
 * An admin may put someone on the going list past capacity; a spot freed by
 * anyone leaving the going list goes to the waitlist.
 */
export async function setRegistrationStatus(
  db: Db,
  event: RsvpRulesEvent,
  registrationId: string,
  status: "GOING" | "WAITLIST" | "CANCELLED",
): Promise<boolean> {
  await lockEvent(db, event.id);
  const row = await db.eventRegistration.findFirst({
    where: { id: registrationId, organizationId: event.organizationId, eventId: event.id },
    select: { id: true, status: true },
  });
  if (!row) return false;
  if (row.status === status) return true;
  await db.eventRegistration.update({
    where: { id: row.id },
    data: { status, cancelledAt: status === "CANCELLED" ? new Date() : null },
  });
  if (row.status === "WAITLIST" && status === "GOING") {
    await enqueueRsvpEmail(db, event.organizationId, row.id, "promoted");
  }
  if (row.status === "GOING") await promoteFromWaitlist(db, event);
  return true;
}

/** How long before the start each reminder goes out. */
export const REMINDER_LEAD_MS = { day: 24 * 60 * 60 * 1000, hour: 60 * 60 * 1000 } as const;

/**
 * Queues the day-before and hour-before reminders for the event's current
 * start. The job key carries the start, so moving the event queues new ones
 * and the old ones find the time changed and do nothing. A reminder whose
 * moment has already passed is skipped (people who sign up that late just
 * got their confirmation).
 */
export async function scheduleRsvpReminders(
  db: Db,
  event: { id: string; organizationId: string; startsAt: Date; rsvpEnabled: boolean },
  now: Date = new Date(),
): Promise<void> {
  if (!event.rsvpEnabled) return;
  for (const stage of ["day", "hour"] as const) {
    const runAt = new Date(event.startsAt.getTime() - REMINDER_LEAD_MS[stage]);
    if (runAt <= now) continue;
    await enqueueJob(db, {
      orgId: event.organizationId,
      kind: "rsvp-fanout",
      key: `${event.id}:${stage}:${Math.floor(event.startsAt.getTime() / 60_000)}`,
      payload: { eventId: event.id, stage, startsAt: event.startsAt.toISOString() },
      runAt,
    });
  }
}

/**
 * Tells everyone still signed up that the event is off (it was deleted). A
 * job does the fan-out on the service path, so it works whoever deleted it
 * (RLS shows sign-ups only to owners and admins).
 */
export async function notifyEventCancelled(
  db: Db,
  organizationId: string,
  eventId: string,
): Promise<void> {
  await enqueueJob(db, {
    orgId: organizationId,
    kind: "rsvp-fanout",
    key: `${eventId}:cancelled`,
    payload: { eventId, stage: "cancelled" },
  });
}

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** A page code: 8 lowercase letters and digits, no look-alikes (l, o, 0, 1). */
export function generateRsvpSlug(): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  return out;
}
