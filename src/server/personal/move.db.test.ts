// Side-effecting import first: the runtime role URLs come from .env.
import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * "Bring anything in?" against the real roles, policies and
 * app.move_personal_items on the local database: what a Personal space
 * lists, the move, and that every public link still resolves from the club
 * (the RSVP page, a ticket, an availability poll with its responses).
 * Throwaway users, their Personal spaces and a club are made here and
 * removed in afterAll. Skipped when the database is not reachable, like the
 * other *.db.test.ts files.
 */

const { requireUserMock } = vi.hoisted(() => ({ requireUserMock: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: requireUserMock, getSession: vi.fn() }));
vi.mock("@/server/cache/invalidate", () => ({ invalidate: vi.fn() }));

import { pollOrgId } from "@/app/poll/[pollId]/poll-org";
import { authDb, disconnectAll } from "@/server/db/clients";
import { loadRsvpPage, rsvpPageTarget } from "@/server/rsvp/page";
import { loadTicket } from "@/server/rsvp/ticket";
import { disconnectOwnerDb, ownerDb } from "@/test/owner-db";

import { bringableIds, clubsUserRuns, loadBringable, movePersonalItems } from "./move";
import { ensurePersonalSpace } from "./space";

const tag = randomBytes(4).toString("hex");
const clubId = `c_bring_${tag}`;
const otherClubId = `c_bring_other_${tag}`;
const chars = "abcdefghjkmnpqrstuvwxyz23456789";
const code = (n: number) => Array.from(randomBytes(n), (b) => chars[b % chars.length]).join("");
const DAY = 24 * 60 * 60 * 1000;

interface U {
  id: string;
  email: string;
  name: string | null;
}
let maya: U;
let other: U;
let spaceId = "";
let reachable = true;

const ids = {
  rsvpEvent: `e_bring_rsvp_${tag}`,
  plainEvent: `e_bring_plain_${tag}`,
  poll: `ap_bring_${tag}`,
  slot: `ps_bring_${tag}`,
  task: `t_bring_${tag}`,
  subtask: `t_bring_sub_${tag}`,
  doneTask: `t_bring_done_${tag}`,
  label: `l_bring_${tag}`,
};
const rsvpSlug = code(8);
const ticketCode = code(12);

async function makeUser(local: string, name: string): Promise<U> {
  return authDb.user.create({
    data: {
      email: `${local}-${tag}@example.edu`,
      name,
      emailVerified: new Date(),
      onboardedAt: new Date(),
      timezone: "America/Chicago",
    },
    select: { id: true, email: true, name: true },
  });
}

beforeAll(async () => {
  try {
    maya = await makeUser("maya", "Maya Patel");
    other = await makeUser("other", "Other Person");
    spaceId = (await ensurePersonalSpace(maya.id)).id;
    // Maya's new club (on its trial), and one where she is only a member.
    await ownerDb.organization.create({
      data: { id: clubId, name: "Chess Club", slug: `chess-${tag}`, timezone: "America/Chicago" },
    });
    await ownerDb.membership.create({
      data: { organizationId: clubId, userId: maya.id, role: "OWNER" },
    });
    await ownerDb.organization.create({
      data: { id: otherClubId, name: "Other Club", slug: `other-${tag}`, timezone: "UTC" },
    });
    await ownerDb.membership.createMany({
      data: [
        { organizationId: otherClubId, userId: other.id, role: "OWNER" },
        { organizationId: otherClubId, userId: maya.id, role: "MEMBER" },
      ],
    });

    const start = new Date(Date.now() + 3 * DAY);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    await ownerDb.event.createMany({
      data: [
        {
          id: ids.rsvpEvent,
          organizationId: spaceId,
          title: "Rooftop picnic",
          startsAt: start,
          endsAt: end,
          createdById: maya.id,
          hostUserId: maya.id,
          rsvpEnabled: true,
          rsvpSlug,
        },
        {
          id: ids.plainEvent,
          organizationId: spaceId,
          title: "Dentist",
          startsAt: start,
          endsAt: end,
          createdById: maya.id,
        },
      ],
    });
    await ownerDb.eventRegistration.create({
      data: {
        organizationId: spaceId,
        eventId: ids.rsvpEvent,
        name: "Guest One",
        email: `guest-${tag}@example.com`,
        phone: "+15550000001",
        inviteCode: code(8),
        ticketCode,
      },
    });
    await ownerDb.availabilityPoll.create({
      data: {
        id: ids.poll,
        organizationId: spaceId,
        title: "Study group time",
        timezone: "America/Chicago",
        durationMinutes: 60,
        createdById: maya.id,
      },
    });
    await ownerDb.pollSlot.create({
      data: {
        id: ids.slot,
        organizationId: spaceId,
        pollId: ids.poll,
        startsAt: start,
        endsAt: end,
      },
    });
    await ownerDb.pollResponse.createMany({
      data: [
        {
          organizationId: spaceId,
          pollId: ids.poll,
          slotId: ids.slot,
          guestName: "Sam",
          guestKeyHash: "a".repeat(64),
          availability: "YES",
        },
        {
          organizationId: spaceId,
          pollId: ids.poll,
          slotId: ids.slot,
          userId: maya.id,
          availability: "IF_NEEDED",
        },
      ],
    });
    await ownerDb.task.create({
      data: {
        id: ids.task,
        organizationId: spaceId,
        // It has a subtask, so it is a story (app.task_hierarchy_guard).
        type: "STORY",
        title: "Book the room",
        rank: "a0",
        createdById: maya.id,
        ownerId: maya.id,
      },
    });
    await ownerDb.task.createMany({
      data: [
        {
          id: ids.subtask,
          organizationId: spaceId,
          parentTaskId: ids.task,
          title: "Call facilities",
          rank: "a1",
          createdById: maya.id,
        },
        {
          id: ids.doneTask,
          organizationId: spaceId,
          title: "Already done",
          rank: "a2",
          createdById: maya.id,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      ],
    });
    await ownerDb.label.create({
      data: { id: ids.label, organizationId: spaceId, name: "Errands", color: "#22c55e" },
    });
    await ownerDb.taskLabel.create({
      data: { organizationId: spaceId, taskId: ids.task, labelId: ids.label },
    });
    requireUserMock.mockResolvedValue(maya);
  } catch (error) {
    console.warn("move.db.test: database not reachable, skipping", error);
    reachable = false;
  }
});

afterAll(async () => {
  if (reachable) {
    await ownerDb.organization.deleteMany({ where: { id: { in: [clubId, otherClubId] } } });
    if (spaceId) await ownerDb.organization.deleteMany({ where: { id: spaceId } });
    await ownerDb.user.deleteMany({
      where: { id: { in: [maya, other].filter(Boolean).map((u) => u.id) } },
    });
  }
  await disconnectAll();
  await disconnectOwnerDb();
});

describe("Bring anything in? against the local database", () => {
  it("lists the Personal space's event pages, events, polls and open top-level tasks", async () => {
    if (!reachable) return;
    const b = await loadBringable(maya.id);
    expect(b).not.toBeNull();
    expect(b!.rsvpEvents.map((e) => [e.id, e.going])).toEqual([[ids.rsvpEvent, 1]]);
    expect(b!.events.map((e) => e.id)).toEqual([ids.plainEvent]);
    expect(b!.polls).toEqual([
      {
        id: ids.poll,
        title: "Study group time",
        kind: "availability",
        responses: 2,
        finalizedEventId: null,
      },
    ]);
    expect(b!.taskGroups).toEqual([
      {
        project: null,
        tasks: [{ id: ids.task, title: "Book the room", dueDate: null, subtasks: 1 }],
      },
    ]);
    expect(bringableIds(b!).has(ids.doneTask)).toBe(false);
  });

  it("lists only the clubs the user owns or runs", async () => {
    if (!reachable) return;
    expect((await clubsUserRuns(maya.id)).map((c) => c.id)).toEqual([clubId]);
  });

  it("refuses a club the user only belongs to, and someone else's Personal items", async () => {
    if (!reachable) return;
    const asMember = await movePersonalItems(maya.id, otherClubId, { eventIds: [ids.rsvpEvent] });
    expect(asMember).toMatchObject({ ok: false });
    const stranger = await movePersonalItems(other.id, otherClubId, { eventIds: [ids.rsvpEvent] });
    expect(stranger).toMatchObject({ ok: false });
    const still = await ownerDb.event.findUnique({
      where: { id: ids.rsvpEvent },
      select: { organizationId: true },
    });
    expect(still?.organizationId).toBe(spaceId);
  });

  it("moves the picked items into the club, and every link still resolves there", async () => {
    if (!reachable) return;
    const result = await movePersonalItems(maya.id, clubId, {
      eventIds: [ids.rsvpEvent],
      pollIds: [ids.poll],
      taskIds: [ids.task],
    });
    expect(result).toEqual({
      ok: true,
      moved: { events: 1, polls: 1, questionPolls: 0, tasks: 2 },
    });

    // The public RSVP page and the guest's ticket, from the club.
    const target = await rsvpPageTarget(rsvpSlug);
    expect(target).toEqual({ organizationId: clubId, eventId: ids.rsvpEvent });
    const page = await loadRsvpPage(rsvpSlug, target!, null);
    expect(page?.title).toBe("Rooftop picnic");
    const ticket = await loadTicket(rsvpSlug, ticketCode);
    expect(ticket).not.toBeNull();

    // /poll/{id}: the club owns it, responses intact.
    expect(await pollOrgId(ids.poll)).toBe(clubId);
    const responses = await ownerDb.pollResponse.findMany({
      where: { pollId: ids.poll },
      select: { organizationId: true, availability: true },
    });
    expect(responses).toHaveLength(2);
    expect(responses.every((r) => r.organizationId === clubId)).toBe(true);

    // The task, its subtask (still under it) and its label, by name, in the club.
    const tasks = await ownerDb.task.findMany({
      where: { id: { in: [ids.task, ids.subtask] } },
      select: {
        id: true,
        organizationId: true,
        parentTaskId: true,
        labels: { select: { label: { select: { name: true, organizationId: true } } } },
      },
      orderBy: { id: "asc" },
    });
    expect(tasks).toEqual([
      {
        id: ids.task,
        organizationId: clubId,
        parentTaskId: null,
        labels: [{ label: { name: "Errands", organizationId: clubId } }],
      },
      { id: ids.subtask, organizationId: clubId, parentTaskId: ids.task, labels: [] },
    ]);

    // What wasn't picked stays in Personal; the move left an audit row in the club.
    const plain = await ownerDb.event.findUnique({
      where: { id: ids.plainEvent },
      select: { organizationId: true },
    });
    expect(plain?.organizationId).toBe(spaceId);
    const audit = await ownerDb.orgAuditLog.count({
      where: { organizationId: clubId, action: "personal.items_moved" },
    });
    expect(audit).toBe(1);

    const after = await loadBringable(maya.id);
    expect(after?.rsvpEvents).toEqual([]);
    expect(after?.polls).toEqual([]);
  });

  it("refuses an item that already moved", async () => {
    if (!reachable) return;
    const again = await movePersonalItems(maya.id, clubId, { eventIds: [ids.rsvpEvent] });
    expect(again).toMatchObject({ ok: false });
  });
});
