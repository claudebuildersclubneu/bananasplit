import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /sign-up carries a ?callbackUrl= on to the new account (a club's join
 * link, or starting a club from a pricing button) and words itself for
 * starting a club when that is where it leads.
 */

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${url}`), { url });
  }),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/auth/config", () => ({ auth: authMock, signIn: vi.fn() }));
vi.mock("./actions", () => ({ signUpAction: vi.fn() }));

const { default: SignUpPage } = await import("./page");

function props(search: Record<string, string>) {
  return { searchParams: Promise.resolve(search) } as unknown as PageProps<"/sign-up">;
}

async function render(search: Record<string, string> = {}) {
  return renderToStaticMarkup(await SignUpPage(props(search)));
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(null);
});

describe("/sign-up", () => {
  it("is about joining a club with a code by default", async () => {
    const html = await render();
    expect(html).toContain("You&#x27;ll join your club with a code next.");
    expect(html).toContain("Enter your club code");
    expect(html).not.toContain('name="callbackUrl"');
  });

  it("is about starting a club when that is where it leads", async () => {
    const html = await render({ callbackUrl: "/onboarding/organization" });
    expect(html).toContain("Next you&#x27;ll set up your profile, then your club.");
    expect(html).toContain("Start your club");
    expect(html).toContain('name="callbackUrl" value="/onboarding/organization"');
    // Log in keeps the destination too.
    expect(html).toContain('href="/sign-in?callbackUrl=%2Fonboarding%2Forganization"');
  });

  it("drops an off-site callbackUrl", async () => {
    const html = await render({ callbackUrl: "https://evil.example/onboarding/organization" });
    expect(html).not.toContain("evil.example");
    expect(html).toContain("You&#x27;ll join your club with a code next.");
  });

  it("sends a signed-in visitor on into the app, or where they were headed", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@example.edu" } });
    await expect(render()).rejects.toMatchObject({ url: "/app" });
    await expect(render({ callbackUrl: "/onboarding/organization" })).rejects.toMatchObject({
      url: "/onboarding/organization",
    });
  });
});
