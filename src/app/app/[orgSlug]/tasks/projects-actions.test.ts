import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/server/db/context", async () =>
  (await import("@/test/fake-context")).fakeContextModule(),
);

const { fake, resetFake } = await import("@/test/fake-context");
const { Role } = await import("@/generated/prisma/enums");
const { archiveProject, createProject, deleteProject, unarchiveProject, updateProject } =
  await import("./projects-actions");

const PROJECT = { id: "proj_1", name: "Workshops", color: "#3366cc" };

function makeDb(opts: { membersCanCreate?: boolean | null; leadId?: string | null } = {}) {
  return {
    orgSettings: {
      findUnique: vi.fn(async () =>
        opts.membersCanCreate === null
          ? null
          : { memberCanCreateProjects: opts.membersCanCreate ?? true },
      ),
    },
    orgTheme: { findUnique: vi.fn(async () => null) },
    membership: {
      findFirst: vi.fn(async ({ where }: { where: { userId: string } }) =>
        where.userId === "stranger" ? null : { id: "mem_1" },
      ),
    },
    project: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...PROJECT,
        ...data,
      })),
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === "missing"
          ? null
          : { id: where.id, leadId: opts.leadId ?? null, startDate: null, targetDate: null },
      ),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...PROJECT,
        ...data,
      })),
      updateMany: vi.fn(async () => ({ count: 1 })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetFake({ db: makeDb() });
});

describe("createProject", () => {
  it("lets any member create while the club allows it (the default, no settings row)", async () => {
    fake.role = Role.MEMBER;
    fake.db = makeDb({ membersCanCreate: null });
    const result = await createProject("org_1", { name: "Side quest" });
    expect("project" in result && result.project.name).toBe("Side quest");
    expect(fake.db.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org_1", name: "Side quest" }),
      }),
    );
  });

  it.each([Role.MEMBER, Role.TREASURER])(
    "refuses a %s when the club keeps projects to admins",
    async (role) => {
      fake.role = role;
      fake.db = makeDb({ membersCanCreate: false });
      expect(await createProject("org_1", { name: "Side quest" })).toEqual({
        error: "Only an owner or admin can create projects in this club.",
      });
      expect(fake.db.project.create).not.toHaveBeenCalled();
    },
  );

  it.each([Role.OWNER, Role.ADMIN])("lets a %s create with the switch off", async (role) => {
    fake.role = role;
    fake.db = makeDb({ membersCanCreate: false });
    expect("project" in (await createProject("org_1", { name: "Workshops" }))).toBe(true);
  });

  it("gives a new project the theme's next chart colour unless one is picked", async () => {
    fake.role = Role.MEMBER;
    await createProject("org_1", { name: "Auto" });
    const auto = fake.db.project.create.mock.calls[0][0].data.color;
    expect(auto).toMatch(/^#[0-9a-f]{6}$/);

    await createProject("org_1", { name: "Picked", color: "#AABBCC" });
    expect(fake.db.project.create.mock.calls[1][0].data.color).toBe("#aabbcc");
  });

  it("validates the name, colour, lead and dates", async () => {
    fake.role = Role.OWNER;
    expect((await createProject("org_1", { name: "  " })) as { error: string }).toEqual({
      error: "Name is required",
    });
    expect(await createProject("org_1", { name: "x", color: "red" })).toEqual({
      error: "Pick a colour.",
    });
    expect(await createProject("org_1", { name: "x", leadId: "stranger" })).toEqual({
      error: "The lead has to be a member of this club.",
    });
    expect(
      await createProject("org_1", {
        name: "x",
        startDate: "2026-11-02",
        targetDate: "2026-10-01",
      }),
    ).toEqual({ error: "The target date can't be before the start." });
    expect(fake.db.project.create).not.toHaveBeenCalled();
  });
});

describe("updateProject", () => {
  it("lets any member rename, recolour and set the status and dates while allowed", async () => {
    fake.role = Role.MEMBER;
    fake.db = makeDb({ leadId: "actor" });
    const result = await updateProject("org_1", "proj_1", {
      name: "Renamed",
      color: "#112233",
      leadId: "actor",
      status: "ON_HOLD",
      startDate: "2026-10-01",
      targetDate: "2026-11-15",
    });
    expect("project" in result).toBe(true);
    expect(fake.db.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "proj_1", organizationId: "org_1" },
        data: expect.objectContaining({
          name: "Renamed",
          color: "#112233",
          leadId: "actor",
          status: "ON_HOLD",
          startDate: new Date("2026-10-01T00:00:00.000Z"),
          targetDate: new Date("2026-11-15T00:00:00.000Z"),
        }),
      }),
    );
  });

  it("refuses a member who isn't the lead when the club keeps projects to admins", async () => {
    fake.role = Role.MEMBER;
    fake.db = makeDb({ membersCanCreate: false, leadId: "someone-else" });
    expect(await updateProject("org_1", "proj_1", { name: "Mine now" })).toEqual({
      error: "Only an owner, an admin or the project's lead can change it.",
    });
    expect(fake.db.project.update).not.toHaveBeenCalled();
  });

  it("still lets the lead keep their own project current with the switch off", async () => {
    fake.role = Role.MEMBER;
    fake.db = makeDb({ membersCanCreate: false, leadId: "actor" });
    expect("project" in (await updateProject("org_1", "proj_1", { status: "DONE" }))).toBe(true);
  });

  it("lets only an admin or the current lead change who leads it", async () => {
    fake.role = Role.MEMBER;
    fake.db = makeDb({ leadId: "someone-else" });
    // Members may edit it (the switch is on), but not make themselves lead.
    expect(await updateProject("org_1", "proj_1", { leadId: "actor" })).toEqual({
      error: "Only an owner, an admin or the project's lead can change who leads it.",
    });
    expect("project" in (await updateProject("org_1", "proj_1", { status: "DONE" }))).toBe(true);

    fake.db = makeDb({ leadId: null });
    expect(await updateProject("org_1", "proj_1", { leadId: "actor" })).toMatchObject({
      error: expect.stringMatching(/who leads it/),
    });
  });

  it("says when the project isn't there", async () => {
    expect(await updateProject("org_1", "missing", { name: "x" })).toEqual({
      error: "Project not found.",
    });
    expect(await updateProject("org_1", "../other-org", { name: "x" })).toEqual({
      error: "Project not found.",
    });
  });
});

describe("archiveProject and unarchiveProject", () => {
  it("refuse a member who isn't the lead, even while members can create projects", async () => {
    fake.role = Role.MEMBER;
    fake.db = makeDb({ leadId: "someone-else" });
    const denied = { error: "Only an owner, an admin or the project's lead can archive it." };
    expect(await archiveProject("org_1", "proj_1")).toEqual(denied);
    expect(await unarchiveProject("org_1", "proj_1")).toEqual(denied);
    expect(fake.db.project.updateMany).not.toHaveBeenCalled();
  });

  it("let the project's lead archive and unarchive it", async () => {
    fake.role = Role.MEMBER;
    fake.db = makeDb({ leadId: "actor" });
    expect(await archiveProject("org_1", "proj_1")).toEqual({});
    expect(fake.db.project.updateMany).toHaveBeenCalledWith({
      where: { id: "proj_1", organizationId: "org_1" },
      data: { archivedAt: expect.any(Date) },
    });
    expect(await unarchiveProject("org_1", "proj_1")).toEqual({});
    expect(fake.db.project.updateMany).toHaveBeenLastCalledWith({
      where: { id: "proj_1", organizationId: "org_1" },
      data: { archivedAt: null },
    });
  });

  it.each([Role.OWNER, Role.ADMIN])("let a %s archive anyone's project", async (role) => {
    fake.role = role;
    fake.db = makeDb({ leadId: "someone-else", membersCanCreate: false });
    expect(await archiveProject("org_1", "proj_1")).toEqual({});
  });

  it("refuse someone with no membership role at all", async () => {
    fake.role = null;
    expect((await archiveProject("org_1", "proj_1")).error).toMatch(/owner, an admin/);
  });
});

describe("deleteProject", () => {
  it("lets the project's lead delete it, not another member", async () => {
    fake.role = Role.MEMBER;
    fake.db = makeDb({ leadId: "someone-else" });
    expect(await deleteProject("org_1", "proj_1")).toEqual({
      error: "Only an owner, an admin or the project's lead can delete it.",
    });
    expect(fake.db.project.deleteMany).not.toHaveBeenCalled();

    fake.db = makeDb({ leadId: "actor", membersCanCreate: false });
    expect(await deleteProject("org_1", "proj_1")).toEqual({});
    expect(fake.db.project.deleteMany).toHaveBeenCalledWith({
      where: { id: "proj_1", organizationId: "org_1" },
    });
  });

  it.each([Role.OWNER, Role.ADMIN])("lets a %s delete anyone's project", async (role) => {
    fake.role = role;
    fake.db = makeDb({ leadId: "someone-else" });
    expect(await deleteProject("org_1", "proj_1")).toEqual({});
    expect(fake.db.project.deleteMany).toHaveBeenCalled();
  });
});
