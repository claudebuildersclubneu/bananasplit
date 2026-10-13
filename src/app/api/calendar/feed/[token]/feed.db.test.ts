// Side-effecting import first: the runtime role URLs come from .env.
import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The personal feed's window against the real roles and policies: events
 * that ended more than 90 days ago are left out, and when an org hits the
 * cap it is the past that gives way, never the next upcoming event.
 * Everything made here is removed in afterAll.
 */

vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn(), getSession: vi.fn() }));

import { authDb, disconnectAll } from "@/server/db/clients";
import { createOrganization } from "@/server/settings/org-creation";
import { disconnectOwnerDb, ownerDb } from "@/test/owner-db";

import { feedReads } from "./route";

const tag = randomBytes(4).toString("hex");
const DAY = 86_400_000;
const HOUR = 3_600_000;
const now = new Date("2026-10-12T16:00:00.000Z");

let owner = { id: "", email: "", name: "" };
let org = { id: "", slug: "", timezone: "UTC" };
let reachable = true;

/** An event the owner is invited to, `startOffset` from now, lasting `hours`. */
async function invitedEvent(title: string, startOffset: number, hours = 2): Promise<string> {
  const startsAt = new Date(now.getTime() + startOffset);
  const event = await ownerDb.event.create({
    data: {
      organizationId: org.id,
      title: `${title} ${tag}`,
      startsAt,
      endsAt: new Date(startsAt.getTime() + hours * HOUR),
      createdById: owner.id,
    },
    select: { id: true },
  });
  await ownerDb.eventAttendee.create({
    data: { organizationId: org.id, eventId: event.id, userId: owner.id },
  });
  return event.id;
}

const ids: Record<string, string> = {};

beforeAll(async () => {
  vi.stubEnv("PLATFORM_ORG_CREATION_ENABLED", "true");
  vi.stubEnv("ORG_CREATION_MODE", "open");
  try {
    const row = await authDb.user.create({
      data: {
        email: `feed-owner-${tag}@example.edu`,
        name: `Feed owner ${tag}`,
        emailVerified: new Date(),
        onboardedAt: new Date(),
      },
      select: { id: true, email: true, name: true },
    });
    owner = { id: row.id, email: row.email, name: row.name ?? "Feed owner" };
    const made = await createOrganization(owner, {
      name: `Feed ${tag}`,
      slug: `feed-${tag}`,
      timezone: "UTC",
    });
    if (!made.ok) throw new Error(JSON.stringify(made));
    org = { id: made.orgId, slug: made.slug, timezone: "UTC" };

    ids.ancient = await invitedEvent("Ended 100 days ago", -100 * DAY);
    ids.recent = await invitedEvent("Ended 10 days ago", -10 * DAY);
    ids.happening = await invitedEvent("In progress", -HOUR);
    ids.soon = await invitedEvent("In 5 days", 5 * DAY);
    ids.later = await invitedEvent("In 30 days", 30 * DAY);
  } catch (error) {
    console.warn("[feed.db.test] skipped:", error instanceof Error ? error.message : error);
    reachable = false;
  }
});

afterAll(async () => {
  vi.unstubAllEnvs();
  if (reachable && org.id) {
    await ownerDb.organization.delete({ where: { id: org.id } });
    await ownerDb.orgSlugHistory.deleteMany({ where: { slug: org.slug } });
  }
  if (owner.id) await ownerDb.user.deleteMany({ where: { id: owner.id } });
  await disconnectAll();
  await disconnectOwnerDb();
});

describe("personal ICS feed window", () => {
  it("leaves out events that ended more than 90 days ago", async () => {
    if (!reachable) return;
    const events = await feedReads.eventsIn(owner.id, org, now);
    expect(new Set(events.map((e) => e.id))).toEqual(
      new Set([ids.recent, ids.happening, ids.soon, ids.later]),
    );
  });

  it("drops the past first when an org reaches the cap", async () => {
    if (!reachable) return;
    // Room for three: everything still to come, then the latest past event.
    const three = await feedReads.eventsIn(owner.id, org, now, 3);
    expect(new Set(three.map((e) => e.id))).toEqual(new Set([ids.happening, ids.soon, ids.later]));
    const four = await feedReads.eventsIn(owner.id, org, now, 4);
    expect(four.map((e) => e.id)).toContain(ids.recent);
  });

  it("keeps the soonest upcoming events when even those overflow it", async () => {
    if (!reachable) return;
    const two = await feedReads.eventsIn(owner.id, org, now, 2);
    expect(two.map((e) => e.id)).toEqual([ids.happening, ids.soon]);
  });
});
