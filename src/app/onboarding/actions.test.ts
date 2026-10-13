import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The onboarding actions are thin: every rule lives in
 * src/server/settings (org-creation.test.ts, invitations.test.ts). These
 * tests pin the wiring: the signed-in user is always the one acting, errors
 * come back as state, success sets the active org and redirects.
 */

const {
  requireUserMock,
  redirectMock,
  createOrganizationMock,
  pendingMock,
  acceptMock,
  cookieMock,
  cookieStore,
  moveMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${url}`), { url });
  }),
  createOrganizationMock: vi.fn(),
  pendingMock: vi.fn(),
  acceptMock: vi.fn(),
  cookieMock: vi.fn(),
  cookieStore: { get: vi.fn(), delete: vi.fn() },
  moveMock: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("@/server/rsvp/personal", () => ({ movePersonalEvent: moveMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/auth/session", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/active-org-cookie", () => ({ setActiveOrgCookie: cookieMock }));
vi.mock("@/server/settings/org-creation", () => ({
  createOrganization: createOrganizationMock,
  isSlugAvailable: vi.fn(async () => true),
}));
vi.mock("@/server/settings/invitations", () => ({
  findPendingInvitationsForMe: pendingMock,
  acceptInvitation: acceptMock,
}));

const { createOrganizationAction, joinPendingInvitationAction } = await import("./actions");

const user = { id: "user_1", email: "jackson@example.edu", name: "Jackson" };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue(user);
  cookieStore.get.mockReturnValue(undefined);
  moveMock.mockResolvedValue(true);
});

describe("createOrganizationAction", () => {
  it("passes the form to the service as the signed-in user and returns its error", async () => {
    createOrganizationMock.mockResolvedValue({ ok: false, error: "That URL is already taken." });
    const result = await createOrganizationAction(
      {},
      form({ name: "New Club", slug: "new-club", code: "" }),
    );
    expect(result.error).toBe("That URL is already taken.");
    expect(createOrganizationMock).toHaveBeenCalledWith(user, {
      name: "New Club",
      slug: "new-club",
      timezone: "UTC",
      code: undefined,
    });
    expect(cookieMock).not.toHaveBeenCalled();
  });

  it("sets the active org and redirects on success", async () => {
    createOrganizationMock.mockResolvedValue({ ok: true, orgId: "org_new", slug: "new-club" });
    await expect(
      createOrganizationAction(
        {},
        form({ name: "New Club", slug: "new-club", timezone: "America/New_York" }),
      ),
    ).rejects.toThrow(/NEXT_REDIRECT \/app\/new-club/);
    expect(cookieMock).toHaveBeenCalledWith("org_new");
    expect(moveMock).not.toHaveBeenCalled();
  });

  it("moves a free event waiting on 'Save to a club' into the new club, once", async () => {
    createOrganizationMock.mockResolvedValue({ ok: true, orgId: "org_new", slug: "new-club" });
    cookieStore.get.mockReturnValue({ value: "evt_free" });
    await expect(
      createOrganizationAction({}, form({ name: "New Club", slug: "new-club" })),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(cookieStore.delete).toHaveBeenCalledWith("bs-rsvp-save");
    // As the signed-in user: the database only moves their own event.
    expect(moveMock).toHaveBeenCalledWith("user_1", "evt_free", "org_new");
  });

  it("still finishes creating the club when the move fails", async () => {
    createOrganizationMock.mockResolvedValue({ ok: true, orgId: "org_new", slug: "new-club" });
    cookieStore.get.mockReturnValue({ value: "evt_free" });
    moveMock.mockRejectedValue(new Error("db down"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      createOrganizationAction({}, form({ name: "New Club", slug: "new-club" })),
    ).rejects.toThrow(/NEXT_REDIRECT \/app\/new-club/);
    error.mockRestore();
  });
});

describe("joinPendingInvitationAction", () => {
  it("only joins an invitation addressed to the caller's verified email", async () => {
    pendingMock.mockResolvedValue([]);
    expect(await joinPendingInvitationAction("inv_other")).toEqual({
      error: "This invite no longer exists.",
    });
    expect(acceptMock).not.toHaveBeenCalled();
  });

  it("accepts and redirects", async () => {
    pendingMock.mockResolvedValue([
      {
        id: "inv_1",
        organizationId: "org_1",
        role: "MEMBER",
        expiresAt: new Date(Date.now() + 1e6),
        orgName: "Org",
      },
    ]);
    acceptMock.mockResolvedValue({ ok: true, orgId: "org_1", orgSlug: "org-one" });
    await expect(joinPendingInvitationAction("inv_1")).rejects.toThrow(
      /NEXT_REDIRECT \/app\/org-one/,
    );
    expect(acceptMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "inv_1", organizationId: "org_1" }),
      user,
    );
  });
});
