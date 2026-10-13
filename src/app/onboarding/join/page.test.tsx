import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A club's join link (/onboarding/join?code=RPKA-YWSF) opened by someone new:
 * profile setup comes first, and the code is kept for the way back
 * (join-code-cookie.ts), so the boxes come back filled at the join step.
 */

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  cookieValue: undefined as string | undefined,
  cookieSet: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${url}`), { url });
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "bs_join_code" && mocks.cookieValue ? { name, value: mocks.cookieValue } : undefined,
    set: mocks.cookieSet,
    delete: vi.fn(),
  }),
}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "u1", email: "new@example.edu", name: "New Member" }),
}));
vi.mock("@/server/onboarding/profile", () => ({ getOnboardingProfile: mocks.profile }));
vi.mock("@/server/settings/invitations", () => ({ findPendingInvitationsForMe: async () => [] }));
vi.mock("./actions", () => ({
  checkInviteCodeAction: vi.fn(),
  joinWithInviteCodeAction: vi.fn(),
}));
vi.mock("../pending-invite-card", () => ({ PendingInviteCard: () => null }));

const { default: JoinPage } = await import("./page");
const { GET } = await import("./remember/route");

function profile(overrides: Record<string, unknown> = {}) {
  return {
    email: "new@example.edu",
    emailVerified: true,
    onboardedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

async function render(search: Record<string, string> = {}) {
  const props = {
    searchParams: Promise.resolve(search),
  } as unknown as PageProps<"/onboarding/join">;
  return renderToStaticMarkup(await JoinPage(props));
}

/** The characters in the code boxes, in order. */
function boxes(html: string): string {
  return [
    ...html.matchAll(
      /aria-label="Club code character \d+ of \d+"[^>]*value="([^"]*)"|value="([^"]*)"[^>]*aria-label="Club code character/g,
    ),
  ]
    .map((m) => m[1] ?? m[2] ?? "")
    .join("");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookieValue = undefined;
});

describe("/onboarding/join", () => {
  it("keeps the link's code while a new member sets up their profile", async () => {
    mocks.profile.mockResolvedValue(profile({ onboardedAt: null }));
    await expect(render({ code: "rpka-ywsf" })).rejects.toMatchObject({
      url: "/onboarding/join/remember?code=rpka-ywsf",
    });
  });

  it("goes straight to profile setup when there's no code to keep", async () => {
    mocks.profile.mockResolvedValue(profile({ onboardedAt: null }));
    await expect(render()).rejects.toMatchObject({ url: "/onboarding/profile/basics" });
    await expect(render({ code: "RPKA" })).rejects.toMatchObject({
      url: "/onboarding/profile/basics",
    });
  });

  it("fills the boxes from the kept code when the member comes back without ?code=", async () => {
    mocks.profile.mockResolvedValue(profile());
    mocks.cookieValue = "RPKA-YWSF";
    expect(boxes(await render())).toBe("RPKAYWSF");
  });

  it("prefers the link's own code to a kept one", async () => {
    mocks.profile.mockResolvedValue(profile());
    mocks.cookieValue = "RPKA-YWSF";
    expect(boxes(await render({ code: "ABCD-EFGH" }))).toBe("ABCDEFGH");
  });
});

describe("/onboarding/join/remember", () => {
  function request(code: string) {
    const url = new URL(
      `http://localhost/onboarding/join/remember?code=${encodeURIComponent(code)}`,
    );
    return { nextUrl: url } as unknown as Parameters<typeof GET>[0];
  }

  it("keeps a valid code in a short-lived httpOnly cookie, then starts profile setup", async () => {
    await expect(GET(request(" rpka ywsf "))).rejects.toMatchObject({
      url: "/onboarding/profile/basics",
    });
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "bs_join_code",
      "RPKA-YWSF",
      expect.objectContaining({ httpOnly: true, path: "/onboarding", maxAge: 86_400 }),
    );
  });

  it("keeps nothing that can't be a code", async () => {
    await expect(GET(request("<b>RPK</b>"))).rejects.toMatchObject({
      url: "/onboarding/profile/basics",
    });
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});
