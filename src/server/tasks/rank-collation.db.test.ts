// @vitest-environment node
// Side-effecting import first: the owner URL comes from .env.
import "dotenv/config";

import { afterAll, describe, expect, it, vi } from "vitest";

// The queries module reaches the session helpers (next-auth) through its
// imports; nothing here signs anybody in.
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));

import { TaskStatus } from "@/generated/prisma/client";
import { compareRank } from "@/lib/tasks/rank";
import { disconnectOwnerDb, ownerDb } from "@/test/owner-db";

import { getTableTasks, getTaskDetail } from "./queries";

/**
 * Task ranks are fractional-indexing keys, generated in byte order ("Zz"
 * comes before "a0"). The column is COLLATE "C"
 * (20261013130000_audit_db_fixes), so the database's plain ORDER BY "rank"
 * (the table view, a task's subtask list) is that same order, whatever the
 * database's default collation. Rows are written inside a transaction that
 * is rolled back. Skipped without the database or the seeded CBC org.
 */

const PROBE = "rankcollationprobe";
const RANKS = ["a1", "Zz", "a0V", "a0", "A5"];
const BYTE_ORDER = [...RANKS].sort(compareRank); // A5, Zz, a0, a0V, a1

class Rollback extends Error {
  constructor(readonly value: unknown) {
    super("rollback");
  }
}

let seeded: { orgId: string; userId: string } | null = null;
try {
  const org = await ownerDb.organization.findUnique({
    where: { slug: "claude-builders-club" },
    select: {
      id: true,
      memberships: { where: { role: "OWNER" }, select: { userId: true }, take: 1 },
    },
  });
  if (org?.memberships[0]) seeded = { orgId: org.id, userId: org.memberships[0].userId };
} catch {
  seeded = null;
}

afterAll(async () => {
  await disconnectOwnerDb();
});

describe.skipIf(!seeded)("Task.rank sorts byte by byte in the database", () => {
  it('is COLLATE "C", so the table view and the subtask list come back in rank order', async () => {
    const { orgId, userId } = seeded!;
    const run = ownerDb.$transaction(async (tx) => {
      const parent = await tx.task.create({
        data: {
          organizationId: orgId,
          title: `${PROBE} parent`,
          rank: "m0",
          status: TaskStatus.IN_PROGRESS,
          createdById: userId,
        },
        select: { id: true },
      });
      for (const rank of RANKS) {
        await tx.task.create({
          data: {
            organizationId: orgId,
            title: `${PROBE} top ${rank}`,
            rank,
            status: TaskStatus.NOT_STARTED,
            createdById: userId,
          },
        });
        await tx.task.create({
          data: {
            organizationId: orgId,
            title: `${PROBE} sub ${rank}`,
            rank,
            createdById: userId,
            parentTaskId: parent.id,
          },
        });
      }
      const collation = await tx.$queryRaw<{ collname: string }[]>`
        SELECT c.collname FROM pg_attribute a JOIN pg_collation c ON c.oid = a.attcollation
         WHERE a.attrelid = '"Task"'::regclass AND a.attname = 'rank'`;
      const table = await getTableTasks(
        tx,
        orgId,
        { q: PROBE, status: TaskStatus.NOT_STARTED },
        1,
        new Date(),
      );
      const detail = await getTaskDetail(tx, orgId, parent.id);
      throw new Rollback({
        collation: collation[0]?.collname,
        table: table.tasks.map((t) => t.rank),
        subtasks: detail?.subtasks.map((t) => t.title.replace(`${PROBE} sub `, "")),
      });
    });
    const result = await run.then(
      () => null,
      (e: unknown) => {
        if (e instanceof Rollback) return e.value;
        throw e;
      },
    );
    expect(result).toEqual({ collation: "C", table: BYTE_ORDER, subtasks: BYTE_ORDER });
    // Nothing was left behind.
    expect(await ownerDb.task.count({ where: { title: { startsWith: PROBE } } })).toBe(0);
  });
});
