// Side-effecting import first: the runtime role URLs come from .env.
import "dotenv/config";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The people directory, its search and the profile sheet against the real
 * roles, policies and pg_trgm on the local seeded database. Skipped when
 * the database or the seed is missing, like the other *.db.test.ts files.
 * Read-only: nothing to undo.
 */

const { requireUserMock } = vi.hoisted(() => ({ requireUserMock: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: requireUserMock }));

import { NotFoundError } from "@/lib/auth/errors";
import { authDb, disconnectAll } from "@/server/db/clients";
import { disconnectOwnerDb, ownerDb } from "@/test/owner-db";

import { getPersonSheet, loadDirectory, searchPeople } from "./directory";

interface SeedUser {
  id: string;
  email: string;
  name: string | null;
}

const EMAILS = [
  "jackson@example.edu",
  "oliver@example.edu",
  "lucas@example.edu",
  "mehr@example.edu",
  "alice@example.edu",
  "carol@example.edu",
];

let seeded: { cbcId: string; roboticsId: string; users: Map<string, SeedUser> } | null = null;
try {
  const orgs = await ownerDb.organization.findMany({
    where: { slug: { in: ["claude-builders-club", "robotics-club"] } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(orgs.map((o) => [o.slug, o.id]));
  const users = await authDb.user.findMany({
    where: { email: { in: EMAILS } },
    select: { id: true, email: true, name: true },
  });
  const cbcId = bySlug.get("claude-builders-club");
  const roboticsId = bySlug.get("robotics-club");
  if (cbcId && roboticsId && users.length === EMAILS.length) {
    seeded = { cbcId, roboticsId, users: new Map(users.map((u) => [u.email.split("@")[0], u])) };
  }
} catch {
  seeded = null;
}

describe.skipIf(!seeded)("people directory against the local database", () => {
  const s = seeded as NonNullable<typeof seeded>;
  const u = (name: string) => s.users.get(name) as SeedUser;

  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(u("jackson"));
  });

  afterAll(async () => {
    await disconnectAll();
    await disconnectOwnerDb();
  });

  it("lists only this org's current members, with chart teams and no emails", async () => {
    const dir = await loadDirectory(s.cbcId, "America/New_York");
    const ids = dir.people.map((p) => p.id);
    expect(ids).toContain(u("oliver").id);
    expect(ids).not.toContain(u("alice").id);
    expect(ids).not.toContain(u("carol").id);
    expect(dir.total).toBe(dir.people.length);
    expect(JSON.stringify(dir)).not.toContain("@example.edu");
    // Teams are the chart's top-level branches.
    const names = dir.teams.map((t) => t.name);
    expect(names[0]).toBe("Leadership");
    expect(names).toEqual(expect.arrayContaining(["Ops & Programs", "Growth"]));
    const oliver = dir.people.find((p) => p.id === u("oliver").id);
    expect(dir.teams.find((t) => t.key === oliver?.teamKey)?.name).toBe("Ops & Programs");
  });

  it("refuses a viewer who is not a member of the org", async () => {
    requireUserMock.mockResolvedValue(u("carol"));
    await expect(loadDirectory(s.cbcId, "UTC")).rejects.toBeInstanceOf(NotFoundError);
    await expect(searchPeople(s.cbcId, "jackson")).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      getPersonSheet(s.cbcId, u("oliver").id, { id: u("carol").id, role: "MEMBER", membersSeeEmails: true }, "UTC"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("search never reaches another org's members (tenant isolation)", async () => {
    // Alice and Carol are Robotics members; Jackson searches CBC.
    const cbc = new Set((await loadDirectory(s.cbcId, "UTC")).people.map((p) => p.id));
    for (const q of ["alice", "carol", "treasurer", "a"]) {
      const { ids } = await searchPeople(s.cbcId, q);
      expect(ids, q).not.toContain(u("alice").id);
      expect(ids, q).not.toContain(u("carol").id);
      for (const id of ids) expect(cbc.has(id), q).toBe(true);
    }
    // And from Robotics, Carol never finds CBC's members, even by close match.
    requireUserMock.mockResolvedValue(u("carol"));
    const fromRobotics = await searchPeople(s.roboticsId, "oliver");
    expect(fromRobotics.ids).not.toContain(u("oliver").id);
    const robotics = await loadDirectory(s.roboticsId, "UTC");
    const roboticsIds = new Set(robotics.people.map((p) => p.id));
    for (const q of ["jackson", "jakson", "ward", "vp"]) {
      for (const id of (await searchPeople(s.roboticsId, q)).ids) expect(roboticsIds.has(id), q).toBe(true);
    }
  });

  it("matches name, title, team, major, year and role, every word", async () => {
    const find = async (q: string) => (await searchPeople(s.cbcId, q)).ids;
    expect(await find("oliver")).toEqual([u("oliver").id]);
    expect(await find("vp ops")).toEqual([u("oliver").id]);
    expect(await find("growth")).toContain(u("lucas").id);
    expect((await searchPeople(s.cbcId, "2026")).ids).toContain(u("mehr").id);
    expect((await searchPeople(s.cbcId, "class of 2026")).ids).toContain(u("mehr").id);
    expect(await find("owner")).toEqual([u("jackson").id]);
    const exact = await searchPeople(s.cbcId, "computer");
    expect(exact.close).toBe(false);
    expect(exact.ids.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to close matches for typos", async () => {
    const typo = await searchPeople(s.cbcId, "jakson");
    expect(typo.close).toBe(true);
    expect(typo.ids[0]).toBe(u("jackson").id);
    expect((await searchPeople(s.cbcId, "olivr")).ids[0]).toBe(u("oliver").id);
    expect((await searchPeople(s.cbcId, "lucs salzgeber")).ids[0]).toBe(u("lucas").id);
    const nothing = await searchPeople(s.cbcId, "zzqxw");
    expect(nothing).toEqual({ ids: [], close: false });
    expect(await searchPeople(s.cbcId, "   ")).toEqual({ ids: [], close: false });
  });

  it("the sheet shows the chart lines and honours email privacy", async () => {
    const viewer = { id: u("jackson").id, role: "MEMBER" as const, membersSeeEmails: false };
    const sheet = await getPersonSheet(s.cbcId, u("oliver").id, viewer, "America/New_York");
    expect(sheet).toMatchObject({ name: "Oliver Ward", title: "VP Ops & Programs", email: null });
    expect(sheet?.reportsTo.map((r) => r.title)).toEqual(["President"]);
    expect(sheet?.leads.map((r) => r.title).sort()).toEqual(["Head of Programs", "Head of Tech"]);
    expect(sheet?.team?.name).toBe("Ops & Programs");

    const admin = await getPersonSheet(s.cbcId, u("oliver").id, { ...viewer, role: "ADMIN" }, "UTC");
    expect(admin?.email).toBe("oliver@example.edu");
    const shared = await getPersonSheet(s.cbcId, u("oliver").id, { ...viewer, membersSeeEmails: true }, "UTC");
    expect(shared?.email).toBe("oliver@example.edu");

    // Another org's user and a bad id: null, never a hint that they exist.
    expect(await getPersonSheet(s.cbcId, u("alice").id, viewer, "UTC")).toBeNull();
    expect(await getPersonSheet(s.cbcId, "../etc", viewer, "UTC")).toBeNull();
  });
});
