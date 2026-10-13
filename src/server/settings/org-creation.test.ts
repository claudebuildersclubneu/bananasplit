import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * createOrganization: the policy, the code, the URL and the limits are all
 * checked on the server; the org, its OWNER membership and the audit row are
 * written in one service transaction for the creating user.
 */

vi.mock("@/server/db/context", async () =>
  (await import("@/test/fake-context")).fakeContextModule(),
);
// The title picked in profile setup, copied onto the new membership.
vi.mock("@/server/onboarding/title", () => ({ ownPreferredTitle: async () => "Project Manager" }));
const { getUserIdentityMock, rateLimitMock } = vi.hoisted(() => ({
  getUserIdentityMock: vi.fn(),
  rateLimitMock: vi.fn(),
}));
vi.mock("@/lib/auth/email-verification", () => ({ getUserIdentity: getUserIdentityMock }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: rateLimitMock,
  rateLimitKey: (...parts: string[]) => parts.join(":"),
  retryAfterText: () => "in a few hours",
}));

const { fake, resetFake } = await import("@/test/fake-context");
const { createOrganization, hashOrgCreationCode, generateOrgCreationCode } =
  await import("./org-creation");

const user = { id: "user_1", email: "jackson@example.edu", name: "Jackson" };
let slugAvailable = true;
let redeemOk = true;
/** What app.rate_limit_hit answers inside the creation transaction (the 30-day allowance). */
let monthlyAllowed = true;

function makeDbs() {
  const queryRaw = vi.fn(async (strings: TemplateStringsArray) => {
    const sql = strings.join("?");
    if (sql.includes("slug_available")) return [{ ok: slugAvailable }];
    if (sql.includes("redeem_org_creation_code")) return [{ ok: redeemOk }];
    if (sql.includes("rate_limit_hit"))
      return [{ allowed: monthlyAllowed, retry_after_ms: monthlyAllowed ? 0 : 86_400_000 }];
    return [{ id: "audit" }];
  });
  return {
    db: { $queryRaw: queryRaw },
    systemDb: {
      $queryRaw: queryRaw,
      organization: { create: vi.fn() },
      membership: { create: vi.fn() },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  resetFake(makeDbs());
  slugAvailable = true;
  redeemOk = true;
  monthlyAllowed = true;
  rateLimitMock.mockResolvedValue({ allowed: true });
  getUserIdentityMock.mockResolvedValue({ ...user, emailVerified: new Date() });
});

afterEach(() => vi.unstubAllEnvs());

const input = { name: "New Club", slug: "new-club", timezone: "America/New_York" };

describe("createOrganization", () => {
  it("refuses an unverified account before touching the database", async () => {
    getUserIdentityMock.mockResolvedValue({ ...user, emailVerified: null });
    const result = await createOrganization(user, input);
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/verify your email/i) });
    expect(fake.systemCalls).toHaveLength(0);
  });

  it("in production with creation disabled, refuses a non-admin even on a direct call", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "president@example.edu");
    const result = await createOrganization(user, input);
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/switched off/i) });
    expect(fake.systemDb.organization.create).not.toHaveBeenCalled();
  });

  it("lets a platform admin create in production: org, OWNER membership and audit in one service tx", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "Jackson@example.edu");
    const result = await createOrganization(user, input);
    expect(result).toMatchObject({ ok: true, slug: "new-club" });
    const orgId = (result as { orgId: string }).orgId;
    expect(fake.systemCalls).toContainEqual([orgId, { userId: "user_1" }]);
    expect(fake.systemDb.organization.create).toHaveBeenCalledWith({
      data: { id: orgId, name: "New Club", slug: "new-club", timezone: "America/New_York" },
    });
    expect(fake.systemDb.membership.create).toHaveBeenCalledWith({
      data: { organizationId: orgId, userId: "user_1", role: "OWNER", title: "Project Manager" },
    });
  });

  it("rejects reserved and taken URLs (retired slugs included, via app.slug_available)", async () => {
    expect(await createOrganization(user, { ...input, slug: "settings" })).toMatchObject({
      ok: false,
    });
    slugAvailable = false;
    expect(await createOrganization(user, input)).toMatchObject({
      ok: false,
      error: "That URL is already taken.",
    });
    expect(fake.systemDb.organization.create).not.toHaveBeenCalled();
  });

  it("invite mode: no code is refused; a used or expired code rolls everything back", async () => {
    vi.stubEnv("ORG_CREATION_MODE", "invite");
    expect(await createOrganization(user, input)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/organization code/i),
    });
    redeemOk = false;
    expect(await createOrganization(user, { ...input, code: "ABCD-EFGH" })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/invalid, used or expired/),
    });
    expect(fake.systemDb.organization.create).not.toHaveBeenCalled();
  });

  it("invite mode: a valid code is redeemed in the same transaction as the insert", async () => {
    vi.stubEnv("ORG_CREATION_MODE", "invite");
    const result = await createOrganization(user, { ...input, code: " abcd-efgh " });
    expect(result).toMatchObject({ ok: true });
    const redeem = fake.systemDb.$queryRaw.mock.calls.find((c: unknown[]) =>
      (c[0] as TemplateStringsArray).join("?").includes("redeem_org_creation_code"),
    );
    expect(redeem?.[1]).toBe(hashOrgCreationCode("ABCDEFGH"));
    expect(fake.systemDb.organization.create).toHaveBeenCalledOnce();
  });

  it("open mode in production enforces one org per user per 30 days and 20 per day platform-wide", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PLATFORM_ORG_CREATION_ENABLED", "true");
    vi.stubEnv("ORG_CREATION_MODE", "open");
    monthlyAllowed = false;
    expect(await createOrganization(user, input)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/every 30 days/),
    });
    expect(fake.systemDb.organization.create).not.toHaveBeenCalled();
    monthlyAllowed = true;
    rateLimitMock.mockImplementation(async (key: string) => ({
      allowed: !key.startsWith("org-create-platform"),
    }));
    expect(await createOrganization(user, input)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/paused/),
    });
    expect(rateLimitMock).toHaveBeenCalledWith("org-create-platform:all", 20, 86_400);
    expect(fake.systemDb.organization.create).not.toHaveBeenCalled();
  });

  it("spends the 30-day allowance inside the creation transaction, so a failed creation keeps it", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PLATFORM_ORG_CREATION_ENABLED", "true");
    vi.stubEnv("ORG_CREATION_MODE", "open");
    await createOrganization(user, input);

    // Never through the limiter's own autocommit call...
    expect(rateLimitMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^org-create-open/),
      expect.anything(),
      expect.anything(),
    );
    // ...but on the creation transaction's own connection, before the insert.
    const hit = fake.systemDb.$queryRaw.mock.calls.find((c: unknown[]) =>
      (c[0] as TemplateStringsArray).join("?").includes("rate_limit_hit"),
    );
    expect(hit?.slice(1)).toEqual(["org-create-open:user_1", 1, 30 * 86_400]);
    expect(
      fake.systemDb.$queryRaw.mock.invocationCallOrder[
        fake.systemDb.$queryRaw.mock.calls.indexOf(hit)
      ],
    ).toBeLessThan(fake.systemDb.organization.create.mock.invocationCallOrder[0]);
    expect(fake.systemCalls).toHaveLength(1);
  });

  it("does not count the 30-day allowance outside production's open mode", async () => {
    await createOrganization(user, input);
    const sql = fake.systemDb.$queryRaw.mock.calls.map((c: unknown[]) =>
      (c[0] as TemplateStringsArray).join("?"),
    );
    expect(sql.some((s: string) => s.includes("rate_limit_hit"))).toBe(false);
  });

  it("keeps the base 3-per-day limit in every mode", async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, retryAfterMs: 3_600_000 });
    expect(await createOrganization(user, input)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/several organizations recently/),
    });
    expect(rateLimitMock).toHaveBeenCalledWith("org-create:user_1", 3, 86_400);
  });

  it("maps a slug race (23505 from the unique index or the slug guard) to a friendly error", async () => {
    fake.systemDb.organization.create.mockRejectedValue(
      Object.assign(new Error("dup"), { code: "P2002" }),
    );
    const { sqlStateOf } = await import("@/server/db/errors");
    // Whatever shape Prisma uses, sqlStateOf maps unique violations to 23505.
    expect(sqlStateOf(Object.assign(new Error("dup"), { code: "P2002" }))).toBe("23505");
    expect(await createOrganization(user, input)).toMatchObject({
      ok: false,
      error: "That URL is already taken.",
    });
  });
});

describe("org-creation codes", () => {
  it("are 4x4 groups from an unambiguous alphabet and hash case- and dash-insensitively", () => {
    const code = generateOrgCreationCode();
    expect(code).toMatch(/^[2-9A-HJKMNP-TV-Z]{4}(-[2-9A-HJKMNP-TV-Z]{4}){3}$/);
    expect(hashOrgCreationCode(code.toLowerCase().replace(/-/g, " "))).toBe(
      hashOrgCreationCode(code),
    );
    expect(hashOrgCreationCode(code)).toMatch(/^[0-9a-f]{64}$/);
  });
});
