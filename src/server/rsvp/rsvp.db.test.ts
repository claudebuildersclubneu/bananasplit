// Side-effecting import first: the runtime role URLs come from .env.
import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Public RSVP pages against the real roles, policies and app.rsvp_page on
 * the local database: spots and the waitlist (including a race for the last
 * spots), moving the waitlist up, what the public page reveals, and who in
 * the suite can read sign-ups. A throwaway org is made as the table owner
 * and removed in afterAll. Skipped when the database is not reachable.
 */

const { requireUserMock } = vi.hoisted(() => ({ requireUserMock: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: requireUserMock, getSession: vi.fn() }));
vi.mock("@/server/cache/invalidate", () => ({ invalidate: vi.fn() }));

import { authDb, disconnectAll } from "@/server/db/clients";
import { withOrgTx, withSystemOrgTx } from "@/server/db/context";
import { disconnectOwnerDb, ownerDb } from "@/test/owner-db";

import { loadRsvpPage, rsvpPageTarget } from "./page";
import {
  registerGuest,
  RSVP_RULES_SELECT,
  scheduleRsvpReminders,
  setRegistrationStatus,
} from "./service";

const tag = randomBytes(4).toString("hex");
const orgId = `c_rsvptest_${tag}`;
const slugChars = "abcdefghjkmnpqrstuvwxyz23456789";
const randomSlug = () =>
  Array.from(randomBytes(8), (b) => slugChars[b % slugChars.length]).join("");

let admin: { id: string; email: string; name: string };
let member: { id: string; email: string; name: string };
let reachable = true;

async function makeUser(local: string) {
  const email = `${local}-${tag}@example.edu`;
  const row = await authDb.user.create({
    data: { email, name: local, emailVerified: new Date(), onboardedAt: new Date() },
    select: { id: true, email: true, name: true },
  });
  return { id: row.id, email: row.email, name: row.name ?? local };
}

async function makeEvent(rules: {
  capacity: number | null;
  waitlist: boolean;
  hideLocation?: boolean;
}) {
  const slug = randomSlug();
  const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const event = await ownerDb.event.create({
    data: {
      organizationId: orgId,
      title: "Robot demo night",
      startsAt: start,
      endsAt: new Date(start.getTime() + 2 * 60 * 60 * 1000),
      location: "Engineering Hall 112, 1 Main St",
      locationDetails: "Second floor, east wing.",
      createdById: admin.id,
      rsvpEnabled: true,
      rsvpSlug: slug,
      rsvpCapacity: rules.capacity,
      rsvpWaitlist: rules.waitlist,
      rsvpHideLocation: rules.hideLocation ?? false,
    },
    select: { id: true },
  });
  return { id: event.id, slug };
}

function rulesOf(eventId: string) {
  return withSystemOrgTx(orgId, ({ db }) =>
    db.event.findFirstOrThrow({
      where: { id: eventId, organizationId: orgId },
      select: RSVP_RULES_SELECT,
    }),
  );
}

function signUp(eventId: string, name: string, email: string) {
  return withSystemOrgTx(orgId, async ({ db }) => {
    const event = await db.event.findFirstOrThrow({
      where: { id: eventId, organizationId: orgId },
      select: RSVP_RULES_SELECT,
    });
    return registerGuest(db, event, { name, email, phone: "+16175550100" });
  });
}

function statuses(eventId: string) {
  return ownerDb.eventRegistration.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: { email: true, status: true },
  });
}

beforeAll(async () => {
  try {
    admin = await makeUser("rsvp-admin");
    member = await makeUser("rsvp-member");
    await ownerDb.organization.create({
      data: {
        id: orgId,
        name: "RSVP Test",
        slug: `rsvp-test-${tag}`,
        timezone: "America/New_York",
      },
    });
    await ownerDb.membership.createMany({
      data: [
        { organizationId: orgId, userId: admin.id, role: "OWNER" },
        { organizationId: orgId, userId: member.id, role: "MEMBER" },
      ],
    });
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  if (reachable) {
    await ownerDb.job.deleteMany({ where: { organizationId: orgId } });
    await ownerDb.organization.deleteMany({ where: { id: orgId } });
    await ownerDb.user.deleteMany({
      where: { id: { in: [admin, member].filter(Boolean).map((u) => u.id) } },
    });
  }
  await disconnectAll();
  await disconnectOwnerDb();
});

describe("RSVP pages against the local database", () => {
  it("finds a live page by its code, and nothing for an unknown or switched-off one", async () => {
    if (!reachable) return;
    const event = await makeEvent({ capacity: null, waitlist: true });
    expect(await rsvpPageTarget(event.slug)).toEqual({ organizationId: orgId, eventId: event.id });
    expect(await rsvpPageTarget("zzzzzzzz")).toBeNull();
    expect(await rsvpPageTarget("NOT-A-CODE")).toBeNull();
    await ownerDb.event.update({ where: { id: event.id }, data: { rsvpEnabled: false } });
    expect(await rsvpPageTarget(event.slug)).toBeNull();
  });

  it("fills the spots, then the waitlist; the same email twice is one sign-up", async () => {
    if (!reachable) return;
    const event = await makeEvent({ capacity: 2, waitlist: true });
    expect(await signUp(event.id, "Ava One", `ava-${tag}@x.test`)).toMatchObject({
      status: "GOING",
    });
    expect(await signUp(event.id, "Ben Two", `ben-${tag}@x.test`)).toMatchObject({
      status: "GOING",
    });
    expect(await signUp(event.id, "Cam Three", `cam-${tag}@x.test`)).toMatchObject({
      status: "WAITLIST",
    });
    expect(await signUp(event.id, "Ava Again", `ava-${tag}@x.test`)).toEqual({ kind: "exists" });
    expect((await statuses(event.id)).map((r) => r.status)).toEqual(["GOING", "GOING", "WAITLIST"]);
    // A confirmation was queued for each new sign-up.
    const jobs = await ownerDb.job.count({ where: { organizationId: orgId, kind: "rsvp-email" } });
    expect(jobs).toBeGreaterThanOrEqual(3);
  });

  it("is full without a waitlist", async () => {
    if (!reachable) return;
    const event = await makeEvent({ capacity: 1, waitlist: false });
    await signUp(event.id, "Dee Four", `dee-${tag}@x.test`);
    expect(await signUp(event.id, "Eli Five", `eli-${tag}@x.test`)).toEqual({
      kind: "closed",
      reason: "full",
    });
  });

  it("moves the first person on the waitlist up when someone going cancels", async () => {
    if (!reachable) return;
    const event = await makeEvent({ capacity: 1, waitlist: true });
    const first = await signUp(event.id, "Fay Six", `fay-${tag}@x.test`);
    await signUp(event.id, "Gus Seven", `gus-${tag}@x.test`);
    await signUp(event.id, "Hal Eight", `hal-${tag}@x.test`);
    if (first.kind !== "registered") throw new Error("expected a sign-up");
    await withSystemOrgTx(orgId, async ({ db }) =>
      setRegistrationStatus(
        db,
        await db.event.findFirstOrThrow({ where: { id: event.id }, select: RSVP_RULES_SELECT }),
        first.registrationId,
        "CANCELLED",
      ),
    );
    expect(await statuses(event.id)).toEqual([
      { email: `fay-${tag}@x.test`, status: "CANCELLED" },
      { email: `gus-${tag}@x.test`, status: "GOING" },
      { email: `hal-${tag}@x.test`, status: "WAITLIST" },
    ]);
    expect(
      await ownerDb.job.count({
        where: { organizationId: orgId, dedupeKey: { contains: ":promoted" } },
      }),
    ).toBeGreaterThanOrEqual(1);
  });

  it("never gives out more spots than there are, however many sign up at once", async () => {
    if (!reachable) return;
    const event = await makeEvent({ capacity: 2, waitlist: true });
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        signUp(event.id, `Racer ${i}`, `racer${i}-${tag}@x.test`),
      ),
    );
    const going = results.filter((r) => r.kind === "registered" && r.status === "GOING").length;
    expect(going).toBe(2);
    expect((await statuses(event.id)).filter((r) => r.status === "WAITLIST")).toHaveLength(4);
  });

  it("shows the public short names and counts, never emails or phones, and the address only to guests when hidden", async () => {
    if (!reachable) return;
    const event = await makeEvent({ capacity: 10, waitlist: true, hideLocation: true });
    const mine = await signUp(event.id, "Ivy Nine Stone", `ivy-${tag}@x.test`);
    if (mine.kind !== "registered") throw new Error("expected a sign-up");
    const target = { organizationId: orgId, eventId: event.id };

    const stranger = await loadRsvpPage(event.slug, target, null);
    expect(stranger).toMatchObject({
      going: 1,
      spotsLeft: 9,
      location: null,
      locationHidden: true,
      viewer: null,
    });
    expect(stranger?.guests).toEqual([expect.objectContaining({ name: "Ivy S." })]);
    expect(JSON.stringify(stranger)).not.toContain("@x.test");
    expect(JSON.stringify(stranger)).not.toContain("6175550100");

    const guest = await loadRsvpPage(event.slug, target, mine.registrationId);
    expect(guest).toMatchObject({
      location: "Engineering Hall 112, 1 Main St",
      locationDetails: "Second floor, east wing.",
      viewer: { status: "GOING", firstName: "Ivy" },
    });
    // Another event's sign-up is no key to this one.
    const other = await makeEvent({ capacity: null, waitlist: true });
    expect(
      (
        await loadRsvpPage(
          other.slug,
          { organizationId: orgId, eventId: other.id },
          mine.registrationId,
        )
      )?.viewer,
    ).toBeNull();
  });

  it("in the suite, only owners and admins read sign-ups", async () => {
    if (!reachable) return;
    const event = await makeEvent({ capacity: null, waitlist: true });
    await signUp(event.id, "Jo Ten", `jo-${tag}@x.test`);
    requireUserMock.mockResolvedValue(admin);
    const asAdmin = await withOrgTx(orgId, ({ db }) =>
      db.eventRegistration.findMany({ where: { eventId: event.id }, select: { email: true } }),
    );
    expect(asAdmin).toEqual([{ email: `jo-${tag}@x.test` }]);
    requireUserMock.mockResolvedValue(member);
    const asMember = await withOrgTx(orgId, ({ db }) =>
      db.eventRegistration.findMany({ where: { eventId: event.id }, select: { email: true } }),
    );
    expect(asMember).toEqual([]);
  });

  it("queues the day-before and hour-before reminders for the event's start", async () => {
    if (!reachable) return;
    const event = await makeEvent({ capacity: null, waitlist: true });
    const rules = await rulesOf(event.id);
    await withSystemOrgTx(orgId, ({ db }) => scheduleRsvpReminders(db, rules));
    const jobs = await ownerDb.job.findMany({
      where: { organizationId: orgId, kind: "rsvp-fanout", dedupeKey: { contains: event.id } },
      select: { dedupeKey: true, runAt: true },
    });
    expect(jobs.map((j) => j.dedupeKey.split(":")[2]).sort()).toEqual(["day", "hour"]);
  });
});
