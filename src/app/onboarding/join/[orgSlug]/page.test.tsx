import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Your role in <club>": the one small club step after joining. It names
 * the club, offers the role picker and says what the club sees of when you
 * can't meet. No prices or trials for a joiner.
 */

const mocks = vi.hoisted(() => ({
  getJoinedClub: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${url}`), { url });
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => ({ id: "u1" }) }));
vi.mock("@/components/auth/signed-in-as", () => ({ SignedInAs: () => null }));
vi.mock("@/server/onboarding/club-role", () => ({ getJoinedClub: mocks.getJoinedClub }));
vi.mock("../actions", () => ({ saveClubRoleAction: vi.fn() }));

const { default: ClubRolePage } = await import("./page");

async function render(slug = "robotics") {
  const props = {
    params: Promise.resolve({ orgSlug: slug }),
  } as unknown as PageProps<"/onboarding/join/[orgSlug]">;
  return renderToStaticMarkup(await ClubRolePage(props)).replace(/&#x27;/g, "'");
}

const club = {
  organizationId: "org_1",
  name: "Robotics",
  slug: "robotics",
  logo: null,
  title: "Developer",
  canSetTitle: true,
  blockedHours: 6,
  sharesAvailability: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getJoinedClub.mockResolvedValue(club);
});

describe("/onboarding/join/[orgSlug]", () => {
  it("asks for the role in this club and confirms what it sees of availability", async () => {
    const html = await render();
    expect(html).toContain("Your role in Robotics");
    expect(html).toContain("Something else");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Members of Robotics see your 6 busy hours a week, never why.");
    expect(html).toContain('href="/onboarding/profile/availability"');
    expect(html).toContain('href="/app/robotics"');
    expect(html).not.toMatch(/trial|\$\d|per month/i);
  });

  it("says so when the club doesn't show availability", async () => {
    mocks.getJoinedClub.mockResolvedValue({ ...club, sharesAvailability: false });
    const html = await render();
    expect(html).toContain("Robotics doesn't show members' availability.");
    expect(html).not.toContain('href="/onboarding/profile/availability"');
  });

  it("goes straight into the club once the join window has passed", async () => {
    mocks.getJoinedClub.mockResolvedValue({ ...club, canSetTitle: false });
    await expect(render()).rejects.toMatchObject({ url: "/app/robotics" });
  });

  it("is not found for a club the caller isn't in", async () => {
    mocks.getJoinedClub.mockResolvedValue(null);
    await expect(render("elsewhere")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
