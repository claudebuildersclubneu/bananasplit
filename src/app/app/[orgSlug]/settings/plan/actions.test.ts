import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/context", async () =>
  (await import("@/test/fake-context")).fakeContextModule(),
);

const { fake, resetFake } = await import("@/test/fake-context");
const { ForbiddenError } = await import("@/lib/auth/errors");
const { switchPlan } = await import("./actions");

let plan = "FREE";

function makeDb() {
  return {
    organization: {
      findUniqueOrThrow: vi.fn(async () => ({ plan })),
      update: vi.fn(async ({ data }: { data: { plan: string } }) => {
        plan = data.plan;
      }),
    },
    $queryRaw: vi.fn(async () => [{ id: "audit" }]),
  };
}

const auditCalls = () =>
  (fake.db.$queryRaw as ReturnType<typeof vi.fn>).mock.calls.filter(([strings]) =>
    (strings as TemplateStringsArray).join("?").includes("write_org_audit"),
  );

beforeEach(() => {
  vi.clearAllMocks();
  plan = "FREE";
  resetFake({ role: "OWNER", db: makeDb() });
});

describe("Admin panel > Plan", () => {
  it("only the OWNER switches plans", async () => {
    for (const role of ["ADMIN", "TREASURER", "MEMBER"]) {
      fake.role = role;
      await expect(switchPlan("org_1", "SOCIETY")).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect(fake.db.organization.update).not.toHaveBeenCalled();
    expect(auditCalls()).toHaveLength(0);
  });

  it("switches at once and records it in the audit log", async () => {
    expect(await switchPlan("org_1", "CLUB")).toEqual({});
    expect(fake.db.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: { plan: "CLUB" },
    });
    const [call] = auditCalls();
    expect(call).toBeDefined();
    const values = call!.slice(1);
    expect(values).toContain("org.plan_changed");
    expect(values).toContain(JSON.stringify({ from: "FREE", to: "CLUB", source: "owner" }));
  });

  it("does nothing for the plan the club is already on", async () => {
    plan = "SOCIETY";
    expect(await switchPlan("org_1", "SOCIETY")).toEqual({});
    expect(fake.db.organization.update).not.toHaveBeenCalled();
    expect(auditCalls()).toHaveLength(0);
  });

  it("refuses anything that isn't a plan", async () => {
    expect((await switchPlan("org_1", "PLATINUM")).error).toMatch(/Choose a plan/);
    expect((await switchPlan("org_1", "club")).error).toMatch(/Choose a plan/);
    expect(fake.db.organization.update).not.toHaveBeenCalled();
  });
});
