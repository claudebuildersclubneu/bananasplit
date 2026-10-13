// Side-effecting import first: the runtime role URLs come from .env.
import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Free RSVP pages and the features around them, against the real roles,
 * policies and functions on the local database: personal spaces, "Save to a
 * club" (app.move_personal_event), the 30-day guest list purge, the bring
 * list, invite links, payments, tickets, and check-ins landing in a club's
 * attendance. Throwaway users and orgs are removed in afterAll. Skipped when
 * the database is not reachable.
 */

const { requireUserMock } = vi.hoisted(() => ({ requireUserMock: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: requireUserMock, getSession: vi.fn() }));
vi.mock("@/server/cache/invalidate", () => ({ invalidate: vi.fn() }));

import { authDb, disconnectAll, serviceDb } from "@/server/db/clients";
import { withOrgTx, withSystemOrgTx, withUserTx } from "@/server/db/context";
import { disconnectOwnerDb, ownerDb } from "@/test/owner-db";

import { setRegistrationCheckIn } from "./checkin";
import { loadRsvpPage } from "./page";
import { ensurePersonalSpace, getPersonalSpace, movePersonalEvent } from "./personal";
import {
  claimPayment,
  confirmPayment,
  registerGuest,
  RSVP_RULES_SELECT,
  saveRsvpItems,
  setItemClaim,
  setRegistrationStatus,
} from "./service";
import { isEventHost, loadTicket } from "./ticket";

const tag = randomBytes(4).toString("hex");
const clubId = `c_rsvpfree_${tag}`;
const otherClubId = `c_rsvpfree2_${tag}`;
const slugChars = "abcdefghjkmnpqrstuvwxyz23456789";
const randomSlug = () =>
  Array.from(randomBytes(8), (b) => slugChars[b % slugChars.length]).join("");
const DAY = 24 * 60 * 60 * 1000;

type U = { id: string; email: string; name: string };
let host: U;
let stranger: U;
let reachable = true;
const users: U[] = [];
const orgIds: string[] = [clubId, otherClubId];

async function makeUser(local: string): Promise<U> {
  const email = `${local}-${tag}@example.edu`;
  const row = await authDb.user.create({
    data: { email, name: `${local} Tester`, emailVerified: new Date(), onboardedAt: new Date() },
    select: { id: true, email: true, name: true },
  });
  const user = { id: row.id, email: row.email, name: row.name ?? local };
  users.push(user);
  return user;
}

async function makeEvent(
  organizationId: string,
  options: { endsInMs?: number; capacity?: number | null; cost?: number | null } = {},
) {
  const slug = randomSlug();
  const end = new Date(Date.now() + (options.endsInMs ?? 3 * DAY));
  const event = await ownerDb.event.create({
    data: {
      organizationId,
      title: "Pizza night",
      startsAt: new Date(end.getTime() - 2 * 60 * 60 * 1000),
      endsAt: end,
      location: "Curry 342",
      createdById: host.id,
      rsvpEnabled: true,
      rsvpSlug: slug,
      rsvpCapacity: options.capacity ?? null,
      ...(options.cost ? { rsvpCostMode: "SPLIT" as const, rsvpCostCents: options.cost } : {}),
    },
    select: { id: true },
  });
  return { id: event.id, slug, organizationId };
}

function signUp(
  event: { id: string; organizationId: string },
  name: string,
  options: { via?: string } = {},
) {
  const email = `${name.split(" ")[0]!.toLowerCase()}-${randomBytes(3).toString("hex")}@x.test`;
  return withSystemOrgTx(event.organizationId, async ({ db }) => {
    const rules = await db.event.findFirstOrThrow({
      where: { id: event.id, organizationId: event.organizationId },
      select: RSVP_RULES_SELECT,
    });
    const outcome = await registerGuest(
      db,
      rules,
      { name, email, phone: "+16175550100" },
      { via: options.via },
    );
    if (outcome.kind !== "registered") throw new Error(`expected a sign-up, got ${outcome.kind}`);
    return { ...outcome, email };
  });
}

beforeAll(async () => {
  try {
    host = await makeUser("free-host");
    stranger = await makeUser("free-stranger");
    await ownerDb.organization.createMany({
      data: [
        {
          id: clubId,
          name: "Free Test Club",
          slug: `free-club-${tag}`,
          timezone: "America/New_York",
        },
        { id: otherClubId, name: "Other Club", slug: `free-other-${tag}`, timezone: "UTC" },
      ],
    });
    await ownerDb.membership.createMany({
      data: [
        { organizationId: clubId, userId: host.id, role: "ADMIN" },
        // In the other club the host is only a member: they can't move events in.
        { organizationId: otherClubId, userId: host.id, role: "MEMBER" },
      ],
    });
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  if (reachable) {
    const spaces = await ownerDb.organization.findMany({
      where: { personalOwnerId: { in: users.map((u) => u.id) } },
      select: { id: true },
    });
    const all = [...orgIds, ...spaces.map((s) => s.id)];
    await ownerDb.job.deleteMany({ where: { organizationId: { in: all } } });
    await ownerDb.attendance.deleteMany({ where: { organizationId: { in: all } } });
    await ownerDb.organization.deleteMany({ where: { id: { in: all } } });
    await ownerDb.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  }
  await disconnectAll();
  await disconnectOwnerDb();
});

describe("personal spaces", () => {
  it("makes one space per person, theirs alone, and finds it again", async () => {
    if (!reachable) return;
    const sessionUser = { id: host.id, email: host.email, name: host.name };
    const first = await ensurePersonalSpace(sessionUser, "America/Chicago");
    const again = await ensurePersonalSpace(sessionUser, "Europe/Paris");
    expect(first.ok && again.ok).toBe(true);
    if (!first.ok || !again.ok) return;
    expect(again.space.id).toBe(first.space.id);
    expect(first.space.timezone).toBe("America/Chicago");
    const row = await ownerDb.organization.findUniqueOrThrow({
      where: { id: first.space.id },
      select: {
        kind: true,
        personalOwnerId: true,
        memberships: { select: { userId: true, role: true } },
      },
    });
    expect(row).toEqual({
      kind: "PERSONAL",
      personalOwnerId: host.id,
      memberships: [{ userId: host.id, role: "OWNER" }],
    });
    expect(await getPersonalSpace(stranger.id)).toBeNull();
  });

  it("can't be turned into a club, or a club into a space, by the runtime roles", async () => {
    if (!reachable) return;
    const space = await getPersonalSpace(host.id);
    if (!space) throw new Error("expected a space");
    requireUserMock.mockResolvedValue(host);
    await expect(
      withOrgTx(space.id, ({ db }) =>
        db.organization.update({ where: { id: space.id }, data: { kind: "CLUB" } }),
      ),
    ).rejects.toThrow();
    await expect(
      withOrgTx(clubId, ({ db }) =>
        db.organization.update({ where: { id: clubId }, data: { personalOwnerId: host.id } }),
      ),
    ).rejects.toThrow();
  });
});

describe("Save to a club", () => {
  it("moves a free event with its guests, bring list and pending jobs, keeping its link", async () => {
    if (!reachable) return;
    const space = await getPersonalSpace(host.id);
    if (!space) throw new Error("expected a space");
    const event = await makeEvent(space.id);
    const ava = await signUp(event, "Ava Free");
    await withSystemOrgTx(space.id, async ({ db }) => {
      await saveRsvpItems(db, event, [{ label: "Chips", slots: 2 }]);
      const item = await db.rsvpItem.findFirstOrThrow({ where: { eventId: event.id } });
      expect(await setItemClaim(db, event, ava.registrationId, item.id, true)).toBe("ok");
    });

    // Not theirs, or not a club they run: nothing moves.
    expect(await movePersonalEvent(stranger.id, event.id, clubId)).toBe(false);
    expect(await movePersonalEvent(host.id, event.id, otherClubId)).toBe(false);
    expect(await movePersonalEvent(host.id, event.id, space.id)).toBe(false);

    expect(await movePersonalEvent(host.id, event.id, clubId)).toBe(true);
    const moved = await ownerDb.event.findUniqueOrThrow({
      where: { id: event.id },
      select: { organizationId: true, rsvpSlug: true, hostUserId: true },
    });
    expect(moved).toEqual({ organizationId: clubId, rsvpSlug: event.slug, hostUserId: host.id });
    expect(
      await ownerDb.eventRegistration.findMany({
        where: { eventId: event.id },
        select: { organizationId: true },
      }),
    ).toEqual([{ organizationId: clubId }]);
    expect(
      await ownerDb.rsvpItemClaim.findMany({
        where: { registrationId: ava.registrationId },
        select: { organizationId: true },
      }),
    ).toEqual([{ organizationId: clubId }]);
    // The confirmation queued in the space now runs in the club.
    expect(
      await ownerDb.job.count({
        where: { organizationId: space.id, dedupeKey: { contains: ava.registrationId } },
      }),
    ).toBe(0);
    expect(
      await ownerDb.job.count({
        where: { organizationId: clubId, dedupeKey: { contains: ava.registrationId } },
      }),
    ).toBeGreaterThan(0);
  });
});

describe("the free guest list purge", () => {
  it("clears a free event's guests 30 days after it ends, and nothing a club keeps", async () => {
    if (!reachable) return;
    const space = await getPersonalSpace(host.id);
    if (!space) throw new Error("expected a space");
    const old = await makeEvent(space.id, { endsInMs: -31 * DAY });
    const recent = await makeEvent(space.id, { endsInMs: -10 * DAY });
    const club = await makeEvent(clubId, { endsInMs: -31 * DAY });
    // Signed up while they were open (the page is closed to new sign-ups now).
    for (const e of [old, recent, club]) {
      await ownerDb.eventRegistration.create({
        data: {
          organizationId: e.organizationId,
          eventId: e.id,
          name: "Old Guest",
          email: `old-${e.id}@x.test`,
          phone: "+16175550100",
          inviteCode: randomSlug(),
          ticketCode: `${randomSlug()}abcd`,
        },
      });
    }
    const rows = await serviceDb.$queryRaw<{ n: number }[]>`
      SELECT app.purge_personal_rsvp_guests(30) AS n`;
    expect(Number(rows[0]?.n)).toBeGreaterThanOrEqual(1);
    const count = (eventId: string) => ownerDb.eventRegistration.count({ where: { eventId } });
    expect(await count(old.id)).toBe(0);
    expect(await count(recent.id)).toBe(1);
    expect(await count(club.id)).toBe(1);
    expect(
      await ownerDb.event.findUniqueOrThrow({
        where: { id: old.id },
        select: { rsvpEnabled: true, rsvpGuestsPurgedAt: true },
      }),
    ).toMatchObject({ rsvpEnabled: false, rsvpGuestsPurgedAt: expect.any(Date) });
  });
});

describe("the bring list", () => {
  it("gives the last slot to one guest when several grab it at once", async () => {
    if (!reachable) return;
    const event = await makeEvent(clubId);
    const guests = await Promise.all(["Bo One", "Cy Two", "Di Three"].map((n) => signUp(event, n)));
    const item = await withSystemOrgTx(clubId, async ({ db }) => {
      await saveRsvpItems(db, event, [{ label: "Speaker", slots: 1 }]);
      return db.rsvpItem.findFirstOrThrow({ where: { eventId: event.id } });
    });
    const outcomes = await Promise.all(
      guests.map((g) =>
        withSystemOrgTx(clubId, ({ db }) =>
          setItemClaim(db, event, g.registrationId, item.id, true),
        ),
      ),
    );
    expect(outcomes.filter((o) => o === "ok")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "full")).toHaveLength(2);
  });

  it("won't let a guest claim another event's line", async () => {
    if (!reachable) return;
    const a = await makeEvent(clubId);
    const b = await makeEvent(clubId);
    const guest = await signUp(a, "Ed Four");
    const itemB = await withSystemOrgTx(clubId, async ({ db }) => {
      await saveRsvpItems(db, b, [{ label: "Cups", slots: 5 }]);
      return db.rsvpItem.findFirstOrThrow({ where: { eventId: b.id } });
    });
    expect(
      await withSystemOrgTx(clubId, ({ db }) =>
        setItemClaim(db, a, guest.registrationId, itemB.id, true),
      ),
    ).toBe("gone");
    // The database refuses it too.
    await expect(
      ownerDb.rsvpItemClaim.create({
        data: { organizationId: clubId, itemId: itemB.id, registrationId: guest.registrationId },
      }),
    ).rejects.toThrow();
  });

  it("keeps lines on save, drops the ones left out with their claims", async () => {
    if (!reachable) return;
    const event = await makeEvent(clubId);
    const guest = await signUp(event, "Fi Five");
    await withSystemOrgTx(clubId, async ({ db }) => {
      await saveRsvpItems(db, event, [
        { label: "Chips", slots: 2 },
        { label: "Ice", slots: 1 },
      ]);
      const [chips, ice] = await db.rsvpItem.findMany({
        where: { eventId: event.id },
        orderBy: { position: "asc" },
      });
      await setItemClaim(db, event, guest.registrationId, ice!.id, true);
      await saveRsvpItems(db, event, [{ id: chips!.id, label: "Chips and dip", slots: 3 }]);
      const left = await db.rsvpItem.findMany({
        where: { eventId: event.id },
        select: { id: true, label: true, slots: true },
      });
      expect(left).toEqual([{ id: chips!.id, label: "Chips and dip", slots: 3 }]);
      expect(
        await db.rsvpItemClaim.count({ where: { registrationId: guest.registrationId } }),
      ).toBe(0);
    });
  });

  it("frees a guest's lines when they cancel, for someone else to take", async () => {
    if (!reachable) return;
    const event = await makeEvent(clubId);
    const [leaving, staying] = await Promise.all([
      signUp(event, "Gi Six"),
      signUp(event, "Ho Seven"),
    ]);
    const item = await withSystemOrgTx(clubId, async ({ db }) => {
      await saveRsvpItems(db, event, [{ label: "Napkins", slots: 1 }]);
      return db.rsvpItem.findFirstOrThrow({ where: { eventId: event.id } });
    });
    const claim = (registrationId: string) =>
      withSystemOrgTx(clubId, ({ db }) => setItemClaim(db, event, registrationId, item.id, true));
    expect(await claim(leaving!.registrationId)).toBe("ok");
    expect(await claim(staying!.registrationId)).toBe("full");

    await withSystemOrgTx(clubId, async ({ db }) =>
      setRegistrationStatus(
        db,
        await db.event.findFirstOrThrow({ where: { id: event.id }, select: RSVP_RULES_SELECT }),
        leaving!.registrationId,
        "CANCELLED",
      ),
    );
    expect(await ownerDb.rsvpItemClaim.count({ where: { itemId: item.id } })).toBe(0);
    expect(await claim(staying!.registrationId)).toBe("ok");
  });
});

describe("invite links", () => {
  it("credits whoever's link a guest came through, and the page names them", async () => {
    if (!reachable) return;
    const event = await makeEvent(clubId);
    const maya = await signUp(event, "Maya Patel");
    const mayaCode = (
      await ownerDb.eventRegistration.findUniqueOrThrow({
        where: { id: maya.registrationId },
        select: { inviteCode: true },
      })
    ).inviteCode;
    const leo = await signUp(event, "Leo Kim", { via: mayaCode });
    await signUp(event, "Noor Ali", { via: "zzzzzzzz" });
    const rows = await ownerDb.eventRegistration.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, invitedById: true },
    });
    expect(rows.map((r) => r.invitedById)).toEqual([null, maya.registrationId, null]);

    const target = { organizationId: clubId, eventId: event.id };
    const visitor = await loadRsvpPage(event.slug, target, null, { via: mayaCode });
    expect(visitor?.invitedBy).toBe("Maya Patel");
    const asMaya = await loadRsvpPage(event.slug, target, maya.registrationId, { via: mayaCode });
    expect(asMaya?.invitedBy).toBeNull();
    expect(asMaya?.viewer).toMatchObject({ invitedCount: 1 });
    expect(asMaya?.viewer?.inviteUrl).toContain(`?via=${mayaCode}`);
    expect(leo.status).toBe("GOING");
  });
});

describe("split the cost", () => {
  it("shares a total among everyone going, and records what guests say and hosts confirm", async () => {
    if (!reachable) return;
    const event = await makeEvent(clubId, { cost: 12000, capacity: 2 });
    const a = await signUp(event, "Al Pay");
    await signUp(event, "Bea Pay");
    const waiting = await signUp(event, "Cat Wait");
    expect(waiting.status).toBe("WAITLIST");

    const page = await loadRsvpPage(
      event.slug,
      { organizationId: clubId, eventId: event.id },
      a.registrationId,
    );
    expect(page?.cost).toMatchObject({ mode: "SPLIT", cents: 12000, share: 6000 });
    expect(page?.viewer?.owes).toBe(6000);

    await withSystemOrgTx(clubId, async ({ db }) => {
      expect(await claimPayment(db, event, a.registrationId, 6000)).toBe(true);
      // Only guests who are going pay.
      expect(await claimPayment(db, event, waiting.registrationId, 6000)).toBe(false);
      expect(await confirmPayment(db, event, waiting.registrationId, true, 6000)).toBe(true);
    });
    const after = await loadRsvpPage(
      event.slug,
      { organizationId: clubId, eventId: event.id },
      a.registrationId,
    );
    expect(after?.viewer?.paid).toEqual({ cents: 6000, confirmed: false });
  });
});

describe("tickets and check-in", () => {
  it("finds a ticket by its code on its own page only, and knows the hosts", async () => {
    if (!reachable) return;
    const event = await makeEvent(clubId);
    const guest = await signUp(event, "Gil Ticket");
    const { ticketCode } = await ownerDb.eventRegistration.findUniqueOrThrow({
      where: { id: guest.registrationId },
      select: { ticketCode: true },
    });
    expect(await loadTicket(event.slug, ticketCode)).toMatchObject({
      registrationId: guest.registrationId,
      name: "Gil Ticket",
      status: "GOING",
    });
    expect(await loadTicket("zzzzzzzz", ticketCode)).toBeNull();
    expect(await loadTicket(event.slug, "notacode")).toBeNull();
    expect(await isEventHost(host.id, clubId)).toBe(true);
    expect(await isEventHost(host.id, otherClubId)).toBe(false);
    expect(await isEventHost(stranger.id, clubId)).toBe(false);
  });

  it("in a club, a check-in lands in its People and Attendance databases, and undoing it takes it out", async () => {
    if (!reachable) return;
    const event = await makeEvent(clubId);
    const guest = await signUp(event, "Hana Door");
    requireUserMock.mockResolvedValue(host);
    const result = await withOrgTx(clubId, ({ db }) =>
      setRegistrationCheckIn(db, {
        organizationId: clubId,
        eventId: event.id,
        registrationId: guest.registrationId,
        checkedIn: true,
        actorUserId: host.id,
        method: "QR",
      }),
    );
    expect(result).toMatchObject({ ok: true, name: "Hana Door", attendance: true });
    const reg = await ownerDb.eventRegistration.findUniqueOrThrow({
      where: { id: guest.registrationId },
      select: { checkedInAt: true, attendanceId: true },
    });
    expect(reg.checkedInAt).not.toBeNull();
    const attendance = await ownerDb.attendance.findUniqueOrThrow({
      where: { id: reg.attendanceId! },
      select: { eventId: true, method: true, contact: { select: { displayName: true } } },
    });
    expect(attendance).toEqual({
      eventId: event.id,
      method: "QR",
      contact: { displayName: "Hana Door" },
    });

    // A second scan says so and changes nothing.
    const again = await withOrgTx(clubId, ({ db }) =>
      setRegistrationCheckIn(db, {
        organizationId: clubId,
        eventId: event.id,
        registrationId: guest.registrationId,
        checkedIn: true,
        actorUserId: host.id,
        method: "QR",
      }),
    );
    expect(again).toMatchObject({ ok: true, already: true });

    await withOrgTx(clubId, ({ db }) =>
      setRegistrationCheckIn(db, {
        organizationId: clubId,
        eventId: event.id,
        registrationId: guest.registrationId,
        checkedIn: false,
        actorUserId: host.id,
        method: "MANUAL",
      }),
    );
    expect(await ownerDb.attendance.count({ where: { id: reg.attendanceId! } })).toBe(0);
  });

  it("on a free page, a check-in is just a check-in", async () => {
    if (!reachable) return;
    const space = await getPersonalSpace(host.id);
    if (!space) throw new Error("expected a space");
    const event = await makeEvent(space.id);
    const guest = await signUp(event, "Ivo Free");
    requireUserMock.mockResolvedValue(host);
    const result = await withOrgTx(space.id, ({ db }) =>
      setRegistrationCheckIn(db, {
        organizationId: space.id,
        eventId: event.id,
        registrationId: guest.registrationId,
        checkedIn: true,
        actorUserId: host.id,
        method: "MANUAL",
      }),
    );
    expect(result).toEqual({ ok: true, name: "Ivo Free" });
    expect(await ownerDb.attendance.count({ where: { organizationId: space.id } })).toBe(0);
  });
});

describe("where a personal space shows up", () => {
  it("never in the list of clubs", async () => {
    if (!reachable) return;
    const clubs = await withUserTx(host.id, ({ db }) =>
      db.membership.findMany({
        where: { userId: host.id, organization: { kind: "CLUB" } },
        select: { organizationId: true },
      }),
    );
    const space = await getPersonalSpace(host.id);
    expect(clubs.map((c) => c.organizationId).sort()).toEqual([clubId, otherClubId].sort());
    expect(clubs.map((c) => c.organizationId)).not.toContain(space?.id);
  });
});
