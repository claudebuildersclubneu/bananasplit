// @vitest-environment node
// Side-effecting import first: the runtime role URLs come from .env.
import "dotenv/config";

import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * Find a time expiry against the local database: a poll is past keeping
 * FIND_A_TIME_KEEP_DAYS after its last slot ends, the list and the poll page
 * stop showing it at once, and the daily cleanup's predicate picks exactly
 * those. Only this file's polls are touched. Skipped without the database or
 * the seeded club.
 */

vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));

import { getOrgPolls, getPollSource } from "@/app/app/[orgSlug]/calendar/queries";
import { availabilityExpiresAt, FIND_A_TIME_KEEP_DAYS } from "@/lib/polls/expiry";
import { disconnectOwnerDb, ownerDb } from "@/test/owner-db";

import { disconnectAll } from "../db/clients";
import { withSystemOrgTx } from "../db/context";
import { expiredAvailabilityPoll, keptAvailabilityPoll } from "./expiry";

const DAY_MS = 24 * 60 * 60 * 1000;

let seeded: { orgId: string; userId: string } | null = null;
try {
  const org = await ownerDb.organization.findUnique({
    where: { slug: "claude-builders-club" },
    select: { id: true, memberships: { select: { userId: true }, take: 1 } },
  });
  if (org?.memberships[0]) seeded = { orgId: org.id, userId: org.memberships[0].userId };
} catch {
  seeded = null;
}

describe.skipIf(!seeded)("Find a time expiry (local database)", () => {
  const s = seeded!;
  const now = new Date();
  const ids: string[] = [];

  async function poll(title: string, lastEndsDaysAgo: number | null): Promise<string> {
    const row = await ownerDb.availabilityPoll.create({
      data: {
        organizationId: s.orgId,
        title,
        timezone: "America/New_York",
        durationMinutes: 30,
        createdById: s.userId,
      },
      select: { id: true },
    });
    ids.push(row.id);
    if (lastEndsDaysAgo !== null) {
      const endsAt = new Date(now.getTime() - lastEndsDaysAgo * DAY_MS);
      await ownerDb.pollSlot.createMany({
        data: [
          // An earlier day too: only the last one counts.
          { startsAt: new Date(endsAt.getTime() - 3 * DAY_MS), days: 3 },
          { startsAt: new Date(endsAt.getTime() - 30 * 60 * 1000), days: 0 },
        ].map((slot) => ({
          organizationId: s.orgId,
          pollId: row.id,
          startsAt: slot.startsAt,
          endsAt: new Date(endsAt.getTime() - slot.days * DAY_MS),
        })),
      });
    }
    return row.id;
  }

  afterAll(async () => {
    if (ids.length) await ownerDb.availabilityPoll.deleteMany({ where: { id: { in: ids } } });
    await disconnectAll();
    await disconnectOwnerDb();
  });

  it("is deleted 10 days after its last slot ends", () => {
    const end = new Date("2026-10-20T21:00:00Z");
    expect(FIND_A_TIME_KEEP_DAYS).toBe(10);
    expect(availabilityExpiresAt(end).toISOString()).toBe("2026-10-30T21:00:00.000Z");
  });

  it("picks the past polls for the cleanup and hides them from the list and the page", async () => {
    const past = await poll("Expiry test: past", FIND_A_TIME_KEEP_DAYS + 1);
    const recent = await poll("Expiry test: recent", FIND_A_TIME_KEEP_DAYS - 1);
    const upcoming = await poll("Expiry test: upcoming", -5);
    const empty = await poll("Expiry test: no slots", null);

    const found = await withSystemOrgTx(s.orgId, async ({ db }) => ({
      expired: await db.availabilityPoll.findMany({
        where: { id: { in: ids }, ...expiredAvailabilityPoll(now) },
        select: { id: true },
      }),
      kept: await db.availabilityPoll.findMany({
        where: { id: { in: ids }, ...keptAvailabilityPoll(now) },
        select: { id: true },
      }),
      listed: (await getOrgPolls(db, s.orgId, now)).map((p) => p.id),
      pastPage: await getPollSource(db, s.orgId, past, now),
      recentPage: await getPollSource(db, s.orgId, recent, now),
    }));

    expect(found.expired.map((p) => p.id)).toEqual([past]);
    expect(found.kept.map((p) => p.id).sort()).toEqual([recent, upcoming, empty].sort());
    expect(found.listed).not.toContain(past);
    expect(found.listed).toEqual(expect.arrayContaining([recent, upcoming]));
    expect(found.pastPage).toBeNull();
    expect(found.recentPage?.id).toBe(recent);
  });
});
