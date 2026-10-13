import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /sign-in offers "Continue with Google" only when the Google client is
 * configured (src/lib/auth/google-sign-in.ts); otherwise the button would
 * only reach Auth.js's "server configuration" error.
 */

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${url}`), { url });
  }),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/auth/config", () => ({ auth: authMock, signIn: vi.fn() }));
vi.mock("./actions", () => ({ passwordSignInAction: vi.fn() }));

const { default: SignInPage } = await import("./page");

const props = { searchParams: Promise.resolve({}) } as unknown as PageProps<"/sign-in">;

async function render() {
  return renderToStaticMarkup(await SignInPage(props));
}

beforeEach(() => {
  authMock.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/sign-in", () => {
  it("offers Google and email/password when the Google client is configured", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "client-id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "client-secret");
    const html = await render();
    expect(html).toContain("Continue with Google");
    expect(html).toContain(">or<");
    expect(html).toContain("Log in to your club workspace.");
    expect(html).toContain('name="password"');
  });

  it.each([
    ["neither is set", "", ""],
    ["the secret is missing", "client-id", ""],
    ["the ID is blank", "   ", "client-secret"],
  ])("offers email/password only when %s", async (_label, id, secret) => {
    vi.stubEnv("AUTH_GOOGLE_ID", id);
    vi.stubEnv("AUTH_GOOGLE_SECRET", secret);
    const html = await render();
    expect(html).not.toContain("Continue with Google");
    expect(html).not.toContain(">or<");
    expect(html).not.toContain("Google account");
    expect(html).toContain("Log in to your club workspace.");
    expect(html).toContain('name="password"');
  });

  // After a Google sign-in Auth.js can land back here; that must lead into
  // the app, as a password sign-in does, not to the marketing page.
  it("sends a signed-in visitor into the app, or to their callbackUrl", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@example.edu" } });
    await expect(render()).rejects.toMatchObject({ url: "/app" });
    const withCallback = {
      searchParams: Promise.resolve({ callbackUrl: "/app/cbc/tasks/t1" }),
    } as unknown as PageProps<"/sign-in">;
    await expect(SignInPage(withCallback)).rejects.toMatchObject({ url: "/app/cbc/tasks/t1" });
  });

  it("carries the callbackUrl to sign-up, so a join link survives creating an account", async () => {
    const html = renderToStaticMarkup(
      await SignInPage({
        searchParams: Promise.resolve({ callbackUrl: "/onboarding/join?code=RPKA-YWSF" }),
      } as unknown as PageProps<"/sign-in">),
    );
    expect(html).toContain('href="/sign-up?callbackUrl=%2Fonboarding%2Fjoin%3Fcode%3DRPKA-YWSF"');
  });
});
