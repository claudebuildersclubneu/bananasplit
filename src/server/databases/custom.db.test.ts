// Side-effecting import first: the runtime role URLs come from .env.
import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Club-made databases against the real roles, policies and functions on the
 * local database: who reads and edits what (app.can_view_database,
 * app.can_edit_database), that another club sees nothing, that cell saves
 * merge, and what type changes, deleting fields, the trash and CSV import
 * do. Two throwaway clubs are made as the table owner and removed in
 * afterAll. Skipped when the database is not reachable.
 */

const { requireUserMock } = vi.hoisted(() => ({ requireUserMock: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: requireUserMock, getSession: vi.fn() }));
vi.mock("@/server/cache/invalidate", () => ({ invalidate: vi.fn() }));

import { authDb, disconnectAll } from "@/server/db/clients";
import { withOrgTx, type OrgContext } from "@/server/db/context";
import { disconnectOwnerDb, ownerDb } from "@/test/owner-db";

import {
  addField,
  createDatabase,
  createRecord,
  DatabaseInputError,
  deleteField,
  importDatabase,
  loadCustomDatabase,
  purgeRecords,
  restoreRecords,
  trashRecords,
  updateCell,
  updateDatabaseSettings,
  updateField,
  type Actor,
} from "./custom";
import { listDatabases } from "./views";

const tag = randomBytes(4).toString("hex");
const orgA = `c_dbtest_a_${tag}`;
const orgB = `c_dbtest_b_${tag}`;

type U = { id: string; email: string; name: string };
let ownerA: U;
let memberA: U;
let ownerB: U;
let reachable = true;

async function makeUser(local: string): Promise<U> {
  const email = `${local}-${tag}@example.edu`;
  const row = await authDb.user.create({
    data: { email, name: local, emailVerified: new Date(), onboardedAt: new Date() },
    select: { id: true, email: true, name: true },
  });
  return { id: row.id, email: row.email, name: row.name ?? local };
}

/** As a user in an org, on the member path (RLS applies). */
function as<T>(
  user: U,
  org: string,
  fn: (actor: Actor, ctx: OrgContext) => Promise<T>,
): Promise<T> {
  requireUserMock.mockResolvedValue(user);
  return withOrgTx(org, (ctx) =>
    fn({ db: ctx.db, organizationId: org, userId: user.id, role: ctx.role }, ctx),
  );
}

beforeAll(async () => {
  try {
    ownerA = await makeUser("db-owner-a");
    memberA = await makeUser("db-member-a");
    ownerB = await makeUser("db-owner-b");
    await ownerDb.organization.createMany({
      data: [
        { id: orgA, name: "DB Test A", slug: `db-test-a-${tag}`, timezone: "UTC" },
        { id: orgB, name: "DB Test B", slug: `db-test-b-${tag}`, timezone: "UTC" },
      ],
    });
    await ownerDb.membership.createMany({
      data: [
        { organizationId: orgA, userId: ownerA.id, role: "OWNER" },
        { organizationId: orgA, userId: memberA.id, role: "MEMBER" },
        { organizationId: orgB, userId: ownerB.id, role: "OWNER" },
      ],
    });
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  if (reachable) {
    await ownerDb.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await ownerDb.user.deleteMany({
      where: { id: { in: [ownerA, memberA, ownerB].filter(Boolean).map((u) => u.id) } },
    });
  }
  await disconnectAll();
  await disconnectOwnerDb();
});

async function newRoster(name: string) {
  const { key } = await as(ownerA, orgA, (a) => createDatabase(a, { name, templateId: "roster" }));
  const db = await as(ownerA, orgA, (a) => loadCustomDatabase(a, key));
  const field = (n: string) => db.fields.find((f) => f.name === n)!;
  return { key, id: db.id, field, fields: db.fields };
}

describe("club-made databases against the local database", () => {
  it("makes a database from a template, saves cells as they're edited, and reads them back", async () => {
    if (!reachable) return;
    const roster = await newRoster(`Roster ${tag}`);
    expect(roster.fields.map((f) => f.name)).toEqual([
      "Name",
      "Email",
      "Phone",
      "Year",
      "Major",
      "Dues paid",
      "Joined",
    ]);
    expect(roster.fields[0]!.isPrimary).toBe(true);

    const row = await as(ownerA, orgA, (a) => createRecord(a, roster.id));
    await as(ownerA, orgA, (a) => updateCell(a, row.id, roster.field("Name").id, "  Maya Patel "));
    await as(ownerA, orgA, (a) =>
      updateCell(a, row.id, roster.field("Email").id, "Maya@Example.EDU"),
    );
    await as(ownerA, orgA, (a) =>
      updateCell(a, row.id, roster.field("Phone").id, "(617) 555-0101"),
    );
    await as(ownerA, orgA, (a) => updateCell(a, row.id, roster.field("Year").id, "Third year"));
    await as(ownerA, orgA, (a) => updateCell(a, row.id, roster.field("Dues paid").id, true));

    const loaded = await as(ownerA, orgA, (a) => loadCustomDatabase(a, roster.key));
    const year = roster.field("Year").options.choices!.find((c) => c.label === "Third year")!;
    expect(loaded.records[0]!.values).toEqual({
      [roster.field("Name").id]: "Maya Patel",
      [roster.field("Email").id]: "maya@example.edu",
      [roster.field("Phone").id]: "+16175550101",
      [roster.field("Year").id]: year.id,
      [roster.field("Dues paid").id]: true,
    });
    // Clearing a cell removes the key.
    await as(ownerA, orgA, (a) => updateCell(a, row.id, roster.field("Dues paid").id, null));
    const after = await ownerDb.databaseRecord.findUniqueOrThrow({ where: { id: row.id } });
    expect(Object.keys(after.values as object)).not.toContain(roster.field("Dues paid").id);
  });

  it("refuses values that don't fit the field", async () => {
    if (!reachable) return;
    const roster = await newRoster(`Strict ${tag}`);
    const row = await as(ownerA, orgA, (a) => createRecord(a, roster.id));
    await expect(
      as(ownerA, orgA, (a) => updateCell(a, row.id, roster.field("Email").id, "not-an-email")),
    ).rejects.toBeInstanceOf(DatabaseInputError);
    await expect(
      as(ownerA, orgA, (a) => updateCell(a, row.id, roster.field("Year").id, "Tenth year")),
    ).rejects.toBeInstanceOf(DatabaseInputError);
    const member = await as(ownerA, orgA, (a) =>
      addField(a, roster.id, { name: "Buddy", type: "MEMBER" }),
    );
    await expect(
      as(ownerA, orgA, (a) => updateCell(a, row.id, member.id, ownerB.id)),
    ).rejects.toBeInstanceOf(DatabaseInputError);
    await as(ownerA, orgA, (a) => updateCell(a, row.id, member.id, memberA.id));
  });

  it("merges two people's edits to different cells of one row", async () => {
    if (!reachable) return;
    const roster = await newRoster(`Merge ${tag}`);
    const row = await as(ownerA, orgA, (a) => createRecord(a, roster.id));
    await Promise.all([
      as(ownerA, orgA, (a) => updateCell(a, row.id, roster.field("Name").id, "Jay Thompson")),
      as(ownerA, orgA, (a) => updateCell(a, row.id, roster.field("Major").id, "Economics")),
      as(ownerA, orgA, (a) => updateCell(a, row.id, roster.field("Email").id, "jay@example.edu")),
    ]);
    const values = (await ownerDb.databaseRecord.findUniqueOrThrow({ where: { id: row.id } }))
      .values as Record<string, unknown>;
    expect(values[roster.field("Name").id]).toBe("Jay Thompson");
    expect(values[roster.field("Major").id]).toBe("Economics");
    expect(values[roster.field("Email").id]).toBe("jay@example.edu");
  });

  it("lets members read but not edit, until the database allows it; fields and deleting for good stay admin-only", async () => {
    if (!reachable) return;
    const roster = await newRoster(`Members ${tag}`);
    const row = await as(ownerA, orgA, (a) =>
      createRecord(a, roster.id, { [roster.field("Name").id]: "Sam Okafor" }),
    );

    const seen = await as(memberA, orgA, (a) => loadCustomDatabase(a, roster.key));
    expect(seen.records).toHaveLength(1);
    expect(seen.canEdit).toBe(false);
    await expect(
      as(memberA, orgA, (a) => updateCell(a, row.id, roster.field("Major").id, "Physics")),
    ).rejects.toBeInstanceOf(DatabaseInputError);
    // Straight through the database: RLS hides the row from the UPDATE and refuses the INSERT.
    const sneaky = await as(memberA, orgA, (_a, ctx) =>
      ctx.db.databaseRecord.updateMany({ where: { id: row.id }, data: { values: {} } }),
    );
    expect(sneaky.count).toBe(0);
    await expect(
      as(memberA, orgA, (_a, ctx) =>
        ctx.db.databaseRecord.create({
          data: {
            organizationId: orgA,
            databaseId: roster.id,
            values: {},
            createdById: memberA.id,
          },
        }),
      ),
    ).rejects.toThrow();

    await as(ownerA, orgA, (a) =>
      updateDatabaseSettings(a, roster.id, {
        name: `Members ${tag}`,
        description: null,
        memberVisibility: "MEMBERS",
        memberCanEdit: true,
      }),
    );
    const mine = await as(memberA, orgA, (a) =>
      createRecord(a, roster.id, { [roster.field("Name").id]: "Priya Shah" }),
    );
    await as(memberA, orgA, (a) => updateCell(a, row.id, roster.field("Major").id, "Physics"));
    await as(memberA, orgA, (a) => trashRecords(a, roster.id, [mine.id]));
    await expect(
      as(memberA, orgA, (a) => purgeRecords(a, roster.id, [mine.id])),
    ).rejects.toBeInstanceOf(DatabaseInputError);
    await expect(
      as(memberA, orgA, (a) => addField(a, roster.id, { name: "Sneaky", type: "TEXT" })),
    ).rejects.toBeInstanceOf(DatabaseInputError);
    await expect(
      as(memberA, orgA, (_a, ctx) =>
        ctx.db.databaseField.create({
          data: { organizationId: orgA, databaseId: roster.id, name: "Sneaky", type: "TEXT" },
        }),
      ),
    ).rejects.toThrow();
  });

  it("hides an admins-only database from members everywhere", async () => {
    if (!reachable) return;
    const roster = await newRoster(`Private ${tag}`);
    await as(ownerA, orgA, (a) =>
      createRecord(a, roster.id, { [roster.field("Name").id]: "Secret" }),
    );
    await as(ownerA, orgA, (a) =>
      updateDatabaseSettings(a, roster.id, {
        name: `Private ${tag}`,
        description: null,
        memberVisibility: "ADMINS",
        memberCanEdit: false,
      }),
    );
    await expect(as(memberA, orgA, (a) => loadCustomDatabase(a, roster.key))).rejects.toThrow();
    const rows = await as(memberA, orgA, (_a, ctx) =>
      ctx.db.databaseRecord.findMany({ where: { databaseId: roster.id } }),
    );
    expect(rows).toEqual([]);
    const fields = await as(memberA, orgA, (_a, ctx) =>
      ctx.db.databaseField.findMany({ where: { databaseId: roster.id } }),
    );
    expect(fields).toEqual([]);
    const listed = await as(memberA, orgA, (_a, ctx) => listDatabases(ctx.db, orgA, ctx.role));
    expect(listed.map((d) => d.key)).not.toContain(roster.key);
  });

  it("shows another club nothing, and can't be written into from another club", async () => {
    if (!reachable) return;
    const roster = await newRoster(`Walled ${tag}`);
    const row = await as(ownerA, orgA, (a) =>
      createRecord(a, roster.id, { [roster.field("Name").id]: "Club A only" }),
    );
    const peek = await as(ownerB, orgB, (_a, ctx) =>
      Promise.all([
        ctx.db.databaseRecord.findMany({ where: { id: row.id } }),
        ctx.db.databaseField.findMany({ where: { databaseId: roster.id } }),
        ctx.db.databaseDefinition.findMany({ where: { id: roster.id } }),
      ]),
    );
    expect(peek).toEqual([[], [], []]);
    await expect(
      as(ownerB, orgB, (a) => updateCell(a, row.id, roster.field("Name").id, "Hacked")),
    ).rejects.toThrow();
    await expect(
      as(ownerB, orgB, (_a, ctx) =>
        ctx.db.databaseRecord.create({
          data: { organizationId: orgB, databaseId: roster.id, values: {}, createdById: ownerB.id },
        }),
      ),
    ).rejects.toThrow();
    const still = await ownerDb.databaseRecord.findUniqueOrThrow({ where: { id: row.id } });
    expect((still.values as Record<string, unknown>)[roster.field("Name").id]).toBe("Club A only");
  });

  it("keeps rows only in club-made databases, never in the built-ins", async () => {
    if (!reachable) return;
    const sessions = await ownerDb.databaseDefinition.findFirst({
      where: { organizationId: orgA, kind: "SESSIONS" },
    });
    if (!sessions) return;
    await expect(
      ownerDb.databaseRecord.create({
        data: { organizationId: orgA, databaseId: sessions.id, values: {} },
      }),
    ).rejects.toThrow(/not a club-made database/);
  });

  it("converts values when a field's type changes, and deleting a field clears its values", async () => {
    if (!reachable) return;
    const roster = await newRoster(`Types ${tag}`);
    const major = roster.field("Major");
    const r1 = await as(ownerA, orgA, (a) => createRecord(a, roster.id, { [major.id]: "12" }));
    const r2 = await as(ownerA, orgA, (a) => createRecord(a, roster.id, { [major.id]: "Physics" }));
    await as(ownerA, orgA, (a) => updateField(a, major.id, { type: "NUMBER" }));
    const values = async (id: string) =>
      (await ownerDb.databaseRecord.findUniqueOrThrow({ where: { id } })).values as Record<
        string,
        unknown
      >;
    expect((await values(r1.id))[major.id]).toBe(12);
    expect((await values(r2.id))[major.id]).toBeUndefined();

    await as(ownerA, orgA, (a) => deleteField(a, roster.field("Phone").id));
    await expect(
      as(ownerA, orgA, (a) => deleteField(a, roster.field("Name").id)),
    ).rejects.toBeInstanceOf(DatabaseInputError);
  });

  it("moves rows to the trash, restores them, and deletes them for good", async () => {
    if (!reachable) return;
    const roster = await newRoster(`Trash ${tag}`);
    const row = await as(ownerA, orgA, (a) => createRecord(a, roster.id));
    await as(ownerA, orgA, (a) => trashRecords(a, roster.id, [row.id]));
    expect((await as(ownerA, orgA, (a) => loadCustomDatabase(a, roster.key))).records).toHaveLength(
      0,
    );
    expect(
      (await as(ownerA, orgA, (a) => loadCustomDatabase(a, roster.key, { trash: true }))).records,
    ).toHaveLength(1);
    await as(ownerA, orgA, (a) => restoreRecords(a, roster.id, [row.id]));
    await as(ownerA, orgA, (a) => trashRecords(a, roster.id, [row.id]));
    expect(await as(ownerA, orgA, (a) => purgeRecords(a, roster.id, "all"))).toBe(1);
    expect(await ownerDb.databaseRecord.count({ where: { id: row.id } })).toBe(0);
  });

  it("imports a spreadsheet as a database, guessing each column's type", async () => {
    if (!reachable) return;
    const csv = [
      "Item,Qty,Price,Paid,Size,Email",
      "T-shirt,2,$15.00,yes,M,a@x.test",
      "Hoodie,1,$35.50,no,L,b@x.test",
      "T-shirt,3,$15.00,yes,S,c@x.test",
      "Sticker,10,$2.00,no,M,d@x.test",
      "Hoodie,1,$35.50,yes,M,e@x.test",
      "T-shirt,1,$15.00,yes,L,f@x.test",
    ].join("\n");
    const summary = await as(ownerA, orgA, (a) => importDatabase(a, { name: `Merch ${tag}`, csv }));
    expect(summary).toMatchObject({ rows: 6, fields: 6, skippedCells: 0 });
    const db = await as(ownerA, orgA, (a) => loadCustomDatabase(a, summary.key));
    expect(db.fields.map((f) => f.type)).toEqual([
      "TEXT",
      "NUMBER",
      "CURRENCY",
      "CHECKBOX",
      "SELECT",
      "EMAIL",
    ]);
    const price = db.fields[2]!;
    expect(db.records[1]!.values[price.id]).toBe(35.5);
  });
});
