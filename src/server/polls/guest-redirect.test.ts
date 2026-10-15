import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Who opening an availability poll's in-app address is sent to its guest
 * page instead of sign-in, sign-up and onboarding.
 */

const { requestHeaders, getSessionMock, membershipCount, pollOrgIdMock } = vi.hoisted(() => ({
  requestHeaders: new Headers(),
  getSessionMock: vi.fn(),
  membershipCount: vi.fn(),
  pollOrgIdMock: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));
vi.mock("@/lib/auth/session", () => ({ getSession: getSessionMock }));
vi.mock("@/app/poll/[pollId]/poll-org", () => ({ pollOrgId: pollOrgIdMock }));
vi.mock("@/server/db/context", () => ({
  withSystemOrgTx: async (_orgId: string, fn: (c: unknown) => unknown) =>
    fn({ db: { membership: { count: membershipCount } } }),
}));

const { guestPollRedirect } = await import("./guest-redirect");

function visit(path: string) {
  requestHeaders.set("x-pathname", path);
}

beforeEach(() => {
  vi.clearAllMocks();
  getSessionMock.mockResolvedValue(null);
  pollOrgIdMock.mockImplementation(async (id: string) => (id === "poll_1" ? "org_1" : null));
  membershipCount.mockResolvedValue(0);
});

describe("guestPollRedirect", () => {
  it("sends a signed-out visitor to the poll's guest page", async () => {
    visit("/app/club/calendar/polls/poll_1");
    expect(await guestPollRedirect("club")).toBe("/poll/poll_1");
    visit("/app/club/calendar/polls/poll_1?tab=group");
    expect(await guestPollRedirect("club")).toBe("/poll/poll_1");
    // Its address under Find a time, which is what the address bar shows now.
    visit("/app/club/calendar/find-a-time/poll_1");
    expect(await guestPollRedirect("club")).toBe("/poll/poll_1");
  });

  it("sends a signed-in non-member there too", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u_out", email: "o@example.edu", name: null } });
    visit("/app/club/calendar/polls/poll_1");
    expect(await guestPollRedirect("club")).toBe("/poll/poll_1");
    expect(membershipCount).toHaveBeenCalledWith({
      where: { organizationId: "org_1", userId: "u_out" },
    });
  });

  it("leaves a member in the app", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u_in", email: "m@example.edu", name: null } });
    membershipCount.mockResolvedValue(1);
    visit("/app/club/calendar/polls/poll_1");
    expect(await guestPollRedirect("club")).toBeNull();
  });

  it("ignores question polls, other pages and other orgs' paths", async () => {
    for (const path of [
      "/app/club/calendar/polls/question_1",
      "/app/club/calendar/polls",
      "/app/club/calendar/polls/poll_1/edit",
      "/app/club/calendar/find-a-time",
      "/app/club/calendar/find-a-time/new",
      "/app/club/tasks/poll_1",
      "/app/other/calendar/polls/poll_1",
      "",
    ]) {
      visit(path);
      expect(await guestPollRedirect("club"), path).toBeNull();
    }
  });
});
