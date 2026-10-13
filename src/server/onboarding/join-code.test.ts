import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The invite code's limits and its first-use race, with the database faked.
 * The real roles, policies and app.rate_limit_hit are exercised in
 * join-code.db.test.ts.
 */

vi.mock("@/server/db/context", async () =>
  (await import("@/test/fake-context")).fakeContextModule(),
);
const { getUserIdentityMock, rateLimitMock, auditMock } = vi.hoisted(() => ({
  getUserIdentityMock: vi.fn(),
  rateLimitMock: vi.fn(),
  auditMock: vi.fn(),
}));
vi.mock("@/lib/auth/email-verification", () => ({ getUserIdentity: getUserIdentityMock }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: rateLimitMock,
  rateLimitKey: (...parts: string[]) => parts.join(":"),
  retryAfterText: () => "in a few minutes",
}));
vi.mock("@/server/audit", () => ({ writeOrgAuditLog: auditMock }));
vi.mock("@/server/notifications", () => ({ notifyUser: vi.fn() }));
vi.mock("@/server/cache/invalidate", () => ({ invalidate: vi.fn() }));
vi.mock("./title", () => ({ ownPreferredTitle: async () => null }));

const { fake, resetFake } = await import("@/test/fake-context");
const { checkJoinCode, getOrCreateJoinCode } = await import("./join-code");

const user = { id: "user_1", email: "maya@example.edu", name: "Maya" };
const ip = "203.0.113.9";
const club = {
  organizationId: "org_1",
  orgName: "Robotics",
  orgSlug: "robotics",
  orgLogo: null,
  enabled: true,
  allowedDomain: null,
  deleted: false,
  memberCount: 12,
};

/** Bucket keys app.rate_limit_hit would refuse one more miss for. */
let fullBuckets: string[] = [];
/** What app.org_by_join_code finds. */
let lookup: (typeof club)[] = [];

function sqlOf(call: unknown[]): string {
  return (call[0] as TemplateStringsArray).join("?");
}

beforeEach(() => {
  vi.clearAllMocks();
  fullBuckets = [];
  lookup = [club];
  resetFake({
    db: {
      $queryRaw: vi.fn(async () => lookup),
      membership: { findFirst: vi.fn(async () => null) },
    },
    systemDb: {
      $executeRaw: vi.fn(async () => 0),
      $queryRaw: vi.fn(async (strings: TemplateStringsArray, key: string) => {
        if (!strings.join("?").includes("rate_limit_hit")) return [];
        const full = fullBuckets.includes(key);
        return [{ allowed: !full, retry_after_ms: full ? 600_000 : 0 }];
      }),
    },
  });
  getUserIdentityMock.mockResolvedValue({ email: user.email, emailVerified: new Date() });
  rateLimitMock.mockResolvedValue({ allowed: true });
});

describe("checkJoinCode limits", () => {
  it("never counts a code that works, however often it is checked", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await checkJoinCode(user, "RPKA-YWSF", ip)).toMatchObject({ ok: true });
    }
    expect(rateLimitMock).not.toHaveBeenCalled();
  });

  it("asks without counting: the check runs in a savepoint that is rolled back", async () => {
    await checkJoinCode(user, "RPKA-YWSF", ip);
    const statements = fake.systemDb.$executeRaw.mock.calls.map(sqlOf);
    expect(statements).toEqual([
      "SAVEPOINT join_code_limit",
      "ROLLBACK TO SAVEPOINT join_code_limit",
    ]);
    const keys = fake.systemDb.$queryRaw.mock.calls.map((call: unknown[]) => call[1]);
    expect(keys).toEqual([`join-code-miss:${user.id}`, `join-code-miss-ip:${ip}`]);
  });

  it.each([
    ["no club has the code", [], "not_found"],
    ["the code is turned off", [{ ...club, enabled: false }], "disabled"],
    ["the club is being deleted", [{ ...club, deleted: true }], "org_inactive"],
  ])("counts a miss for the user and the network when %s", async (_label, rows, reason) => {
    lookup = rows as (typeof club)[];
    const result = await checkJoinCode(user, "ZZZZ-ZZZZ", ip);
    expect(result).toMatchObject({ ok: false, reason });
    expect(rateLimitMock).toHaveBeenCalledWith(`join-code-miss:${user.id}`, 10, 900);
    expect(rateLimitMock).toHaveBeenCalledWith(`join-code-miss-ip:${ip}`, 60, 3600);
  });

  it("refuses every lookup, a right code too, once the network has used its misses", async () => {
    fullBuckets = [`join-code-miss-ip:${ip}`];
    const result = await checkJoinCode(user, "RPKA-YWSF", ip);
    expect(result).toMatchObject({ ok: false, reason: "rate_limited" });
    expect(fake.db.$queryRaw).not.toHaveBeenCalled();
  });

  it("sizes the network's allowance from JOIN_CODE_MISSES_PER_IP_HOUR", async () => {
    vi.stubEnv("JOIN_CODE_MISSES_PER_IP_HOUR", "250");
    lookup = [];
    await checkJoinCode(user, "ZZZZ-ZZZZ", ip);
    expect(rateLimitMock).toHaveBeenCalledWith(`join-code-miss-ip:${ip}`, 250, 3600);
    vi.unstubAllEnvs();
  });

  it("lets the lookup through when the limiter's database call fails", async () => {
    fake.systemDb.$queryRaw.mockRejectedValueOnce(new Error("connection reset"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});
    expect(await checkJoinCode(user, "RPKA-YWSF", ip)).toMatchObject({ ok: true });
  });
});

describe("getOrCreateJoinCode", () => {
  const view = {
    code: "RPKA-YWSF",
    enabled: true,
    allowedDomain: null,
    useCount: 0,
    rotatedAt: new Date(),
  };
  const unique = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

  function db(findUnique: ReturnType<typeof vi.fn>, create: ReturnType<typeof vi.fn>) {
    return {
      $executeRaw: vi.fn(async () => 0),
      orgJoinCode: { findUnique, create },
    } as unknown as Parameters<typeof getOrCreateJoinCode>[0];
  }

  it("uses the code another admin's request just made, instead of failing", async () => {
    const winner = { ...view, code: "WINS-ARCE" };
    const findUnique = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    const create = vi.fn().mockRejectedValueOnce(unique());
    const result = await getOrCreateJoinCode(db(findUnique, create), "org_1", "admin_2");
    expect(result).toBe(winner);
    expect(create).toHaveBeenCalledOnce();
    // The winning request logged its own creation.
    expect(auditMock).not.toHaveBeenCalled();
  });

  it("retries with a fresh code when the random one belongs to another org", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockRejectedValueOnce(unique()).mockResolvedValueOnce(view);
    const result = await getOrCreateJoinCode(db(findUnique, create), "org_1", "admin_1");
    expect(result).toBe(view);
    expect(create).toHaveBeenCalledTimes(2);
    expect(auditMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "join_code.created" }),
    );
  });
});
