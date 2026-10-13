import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /onboarding is where sign-up and sign-in land
 * (docs/features/personal-and-clubs.md). It is the flowchart's "Profile
 * complete?" decision: step 1 of "Your profile" first, for everyone (a club member
 * included: the club's layout sends anyone not onboarded here), then where
 * sign-up started, else the Personal space.
 */

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  personalHomeHref: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${url}`), { url });
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "u1", email: "verify-test@example.edu", name: "Verify Test" }),
}));
vi.mock("@/server/onboarding/profile", () => ({ getOnboardingProfile: mocks.profile }));
vi.mock("@/server/personal/space", () => ({ personalHomeHref: mocks.personalHomeHref }));

const { default: OnboardingPage } = await import("./page");

function render(searchParams: Record<string, string> = {}) {
  return OnboardingPage({ searchParams: Promise.resolve(searchParams) });
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    name: "Verify Test",
    email: "verify-test@example.edu",
    emailVerified: true,
    onboardedAt: new Date("2026-09-01T00:00:00Z"),
    memberships: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.personalHomeHref.mockResolvedValue("/app/me-abc");
});

describe("OnboardingPage", () => {
  it("sends a club member who never did step 1 of the profile there, not back to the club (no loop)", async () => {
    mocks.profile.mockResolvedValue(
      profile({ onboardedAt: null, memberships: [{ name: "CBC", slug: "cbc" }] }),
    );
    await expect(render()).rejects.toMatchObject({ url: "/onboarding/profile/basics" });
    expect(mocks.personalHomeHref).not.toHaveBeenCalled();
  });

  it("sends a new account to step 1 of the profile first, keeping where sign-up started", async () => {
    mocks.profile.mockResolvedValue(profile({ onboardedAt: null }));
    await expect(render({ callbackUrl: "/onboarding/organization" })).rejects.toMatchObject({
      url: "/onboarding/profile/basics?callbackUrl=%2Fonboarding%2Forganization",
    });
  });

  it("then opens the Personal space (made on the way if missing)", async () => {
    mocks.profile.mockResolvedValue(profile());
    await expect(render()).rejects.toMatchObject({ url: "/app/me-abc" });
    expect(mocks.personalHomeHref).toHaveBeenCalledWith("u1");
  });

  it("opens Personal for a club member too: switching is from there", async () => {
    mocks.profile.mockResolvedValue(profile({ memberships: [{ name: "CBC", slug: "cbc" }] }));
    await expect(render()).rejects.toMatchObject({ url: "/app/me-abc" });
  });

  it("returns to where sign-up started, and never off the site", async () => {
    mocks.profile.mockResolvedValue(profile());
    await expect(render({ callbackUrl: "/onboarding/join?code=ABCD" })).rejects.toMatchObject({
      url: "/onboarding/join?code=ABCD",
    });
    await expect(render({ callbackUrl: "https://evil.example" })).rejects.toMatchObject({
      url: "/app/me-abc",
    });
  });
});
