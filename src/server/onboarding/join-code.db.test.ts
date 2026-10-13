// Side-effecting import first: the runtime role URLs come from .env.
import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/** A per-run address in the benchmarking range, so the per-IP join-code limit never carries over between runs. */
const ip = `198.18.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;

/**
 * Joining an org with its invite code, against the real roles, policies and
 * app.org_by_join_code on the local database. A throwaway org and users are
 * made as the table owner and removed in afterAll. Skipped when the
 * database is not reachable, like the other *.db.test.ts files.
 */

const { requireUserMock } = vi.hoisted(() => ({ requireUserMock: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: requireUserMock }));
vi.mock("@/server/cache/invalidate", () => ({ invalidate: vi.fn() }));

import { generateJoinCode } from "@/lib/join-code";
import { authDb, disconnectAll } from "@/server/db/clients";
import { withOrgTx } from "@/server/db/context";
import { disconnectOwnerDb, ownerDb } from "@/test/owner-db";

import {
  checkJoinCode,
  getOrCreateJoinCode,
  joinWithCode,
  rotateJoinCode,
  updateJoinCodeSettings,
} from "./join-code";

const tag = randomBytes(4).toString("hex");
const orgId = `c_jointest_${tag}`;
const slug = `join-test-${tag}`;
/** A second org with no code yet, for two admins creating it at once. */
const raceOrgId = `c_joinrace_${tag}`;

/** Another per-run address, for the room-on-one-network case. */
function freshIp(): string {
  return `198.19.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;
}

interface U {
  id: string;
  email: string;
  name: string;
}
let admin: U;
let joiner: U;
let outsider: U;
let unverified: U;
let reachable = true;

async function makeUser(
  local: string,
  domain: string,
  verified: boolean,
  title: string | null = null,
): Promise<U> {
  const email = `${local}-${tag}@${domain}`;
  const row = await authDb.user.create({
    data: {
      email,
      name: local,
      emailVerified: verified ? new Date() : null,
      onboardedAt: new Date(),
      preferredTitle: title,
    },
    select: { id: true, email: true, name: true },
  });
  return { id: row.id, email: row.email, name: row.name ?? local };
}

beforeAll(async () => {
  try {
    admin = await makeUser("admin", "example.edu", true);
    joiner = await makeUser("joiner", "example.edu", true, "Project Manager");
    outsider = await makeUser("outsider", "other.test", true);
    unverified = await makeUser("unverified", "example.edu", false);
    await ownerDb.organization.create({
      data: { id: orgId, name: "Join Test", slug, timezone: "UTC" },
    });
    await ownerDb.membership.create({
      data: { organizationId: orgId, userId: admin.id, role: "OWNER" },
    });
    await ownerDb.organization.create({
      data: { id: raceOrgId, name: "Join Race", slug: `join-race-${tag}`, timezone: "UTC" },
    });
    await ownerDb.membership.create({
      data: { organizationId: raceOrgId, userId: admin.id, role: "OWNER" },
    });
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  if (reachable) {
    await ownerDb.organization.deleteMany({ where: { id: { in: [orgId, raceOrgId] } } });
    await ownerDb.user.deleteMany({
      where: { id: { in: [admin, joiner, outsider, unverified].filter(Boolean).map((u) => u.id) } },
    });
  }
  await disconnectAll();
  await disconnectOwnerDb();
});

/** As the org's admin, on the member path (RLS applies). */
function asAdmin<T>(fn: Parameters<typeof withOrgTx<T>>[1]): Promise<T> {
  requireUserMock.mockResolvedValue(admin);
  return withOrgTx(orgId, fn);
}

describe("invite codes against the local database", () => {
  it("an admin gets one code for the org, created on first use", async () => {
    if (!reachable) return;
    const first = await asAdmin(({ db }) => getOrCreateJoinCode(db, orgId, admin.id));
    const again = await asAdmin(({ db }) => getOrCreateJoinCode(db, orgId, admin.id));
    expect(first.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(again.code).toBe(first.code);
    expect(first.enabled).toBe(true);
  });

  it("shows a verified user which org the code opens, then joins them as a member with their title", async () => {
    if (!reachable) return;
    const { code } = await asAdmin(({ db }) => getOrCreateJoinCode(db, orgId, admin.id));

    const check = await checkJoinCode(
      joiner,
      ` ${code.toLowerCase().slice(0, 3)} ${code.toLowerCase().slice(3)} `,
      ip,
    );
    expect(check).toMatchObject({
      ok: true,
      alreadyMember: false,
      org: { orgSlug: slug, memberCount: 1 },
    });

    const joined = await joinWithCode(joiner, code, ip);
    expect(joined).toEqual({ ok: true, orgId, orgSlug: slug });
    const membership = await ownerDb.membership.findUnique({
      where: { userId_organizationId: { userId: joiner.id, organizationId: orgId } },
      select: { role: true, title: true },
    });
    expect(membership).toEqual({ role: "MEMBER", title: "Project Manager" });
    const row = await ownerDb.orgJoinCode.findUnique({
      where: { organizationId: orgId },
      select: { useCount: true },
    });
    expect(row?.useCount).toBe(1);

    // Joining twice is harmless.
    expect(await joinWithCode(joiner, code, ip)).toEqual({ ok: true, orgId, orgSlug: slug });
    const again = await ownerDb.orgJoinCode.findUnique({
      where: { organizationId: orgId },
      select: { useCount: true },
    });
    expect(again?.useCount).toBe(1);
  });

  it("refuses an unverified email before looking the code up", async () => {
    if (!reachable) return;
    // Local development may treat every address as verified; a deployment never does.
    vi.stubEnv("AUTH_REQUIRE_EMAIL_VERIFICATION", "true");
    const { code } = await asAdmin(({ db }) => getOrCreateJoinCode(db, orgId, admin.id));
    expect(await checkJoinCode(unverified, code, ip)).toMatchObject({
      ok: false,
      reason: "unverified",
    });
    expect(await joinWithCode(unverified, code, ip)).toMatchObject({ ok: false });
    vi.unstubAllEnvs();
  });

  it("holds people to the org's email domain when one is set", async () => {
    if (!reachable) return;
    const updated = await asAdmin(({ db }) =>
      updateJoinCodeSettings(db, orgId, admin.id, { allowedDomain: "@Example.edu" }),
    );
    expect(updated).toMatchObject({ ok: true, code: { allowedDomain: "example.edu" } });
    const { code } = await asAdmin(({ db }) => getOrCreateJoinCode(db, orgId, admin.id));
    expect(await checkJoinCode(outsider, code, ip)).toMatchObject({
      ok: false,
      reason: "wrong_domain",
    });
    expect(await joinWithCode(outsider, code, ip)).toMatchObject({ ok: false });
    const bad = await asAdmin(({ db }) =>
      updateJoinCodeSettings(db, orgId, admin.id, { allowedDomain: "not a domain" }),
    );
    expect(bad.ok).toBe(false);
    await asAdmin(({ db }) => updateJoinCodeSettings(db, orgId, admin.id, { allowedDomain: null }));
  });

  it("stops working when turned off, and the old code dies when it is replaced", async () => {
    if (!reachable) return;
    const { code: old } = await asAdmin(({ db }) => getOrCreateJoinCode(db, orgId, admin.id));
    await asAdmin(({ db }) => updateJoinCodeSettings(db, orgId, admin.id, { enabled: false }));
    expect(await checkJoinCode(outsider, old, ip)).toMatchObject({ ok: false, reason: "disabled" });
    await asAdmin(({ db }) => updateJoinCodeSettings(db, orgId, admin.id, { enabled: true }));

    const rotated = await asAdmin(({ db }) => rotateJoinCode(db, orgId, admin.id));
    expect(rotated.code).not.toBe(old);
    expect(await checkJoinCode(outsider, old, ip)).toMatchObject({
      ok: false,
      reason: "not_found",
    });
    expect(await checkJoinCode(outsider, rotated.code, ip)).toMatchObject({ ok: true });
  });

  it("never lets a plain member read or change the code", async () => {
    if (!reachable) return;
    requireUserMock.mockResolvedValue(joiner);
    const seen = await withOrgTx(orgId, ({ db }) =>
      db.orgJoinCode.findMany({ select: { code: true } }),
    );
    expect(seen).toEqual([]);
    await expect(
      withOrgTx(orgId, ({ db }) => rotateJoinCode(db, orgId, joiner.id)),
    ).rejects.toThrow();
  });

  it("lets a room on one network check a working code freely; only misses use the allowance", async () => {
    if (!reachable) return;
    vi.stubEnv("JOIN_CODE_MISSES_PER_IP_HOUR", "3");
    try {
      const room = freshIp();
      const { code } = await asAdmin(({ db }) => getOrCreateJoinCode(db, orgId, admin.id));
      // The boxes, a ?code= link and the join's own re-check: none of it counts.
      for (let i = 0; i < 6; i++) {
        expect(await checkJoinCode(joiner, code, room)).toMatchObject({ ok: true });
      }
      expect(await joinWithCode(joiner, code, room)).toMatchObject({ ok: true });

      for (let i = 0; i < 3; i++) {
        expect(await checkJoinCode(outsider, generateJoinCode(), room)).toMatchObject({
          reason: "not_found",
        });
      }
      // The allowance is spent: even the right code waits, so guessing on can't find one.
      expect(await checkJoinCode(joiner, code, room)).toMatchObject({ reason: "rate_limited" });
      expect(await checkJoinCode(joiner, code, freshIp())).toMatchObject({ ok: true });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("gives two admins opening Members at once the same new code", async () => {
    if (!reachable) return;
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    let markInserted!: () => void;
    const inserted = new Promise<void>((resolve) => (markInserted = resolve));

    requireUserMock.mockResolvedValue(admin);
    // The first request creates the code and keeps its transaction open...
    const first = withOrgTx(raceOrgId, async ({ db }) => {
      const row = await getOrCreateJoinCode(db, raceOrgId, admin.id);
      markInserted();
      await held;
      return row;
    });
    await inserted;
    // ...so the second sees no code yet, inserts too and waits on the first.
    const second = withOrgTx(raceOrgId, ({ db }) => getOrCreateJoinCode(db, raceOrgId, admin.id));
    await waitForLockWait();
    release();

    const [a, b] = await Promise.all([first, second]);
    expect(b.code).toBe(a.code);
    const created = await ownerDb.orgAuditLog.count({
      where: { organizationId: raceOrgId, action: "join_code.created" },
    });
    expect(created).toBe(1);
  });
});

/** Until some transaction waits on another's lock (the second insert), at most ~3s. */
async function waitForLockWait(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    const rows = await ownerDb.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted AND locktype = 'transactionid'`;
    if ((rows[0]?.n ?? 0) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
