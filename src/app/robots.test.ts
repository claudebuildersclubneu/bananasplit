import { afterEach, describe, expect, it, vi } from "vitest";

import { siteOrigin } from "@/lib/brand/site-origin";

import robots from "./robots";
import sitemap from "./sitemap";

/**
 * robots.txt and sitemap.xml use the app's own origin (as emails do), and a
 * production deployment with no app URL leaves the absolute URLs out rather
 * than failing the build.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

function production(appUrl: string) {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", appUrl);
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
}

describe("robots.txt", () => {
  it("keeps crawlers out of the app and the one-time links, and points at the sitemap", () => {
    production("https://bananasplit.app");
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.allow).toEqual(["/", "/rsvp", "/sign-in", "/sign-up"]);
    expect(rules.disallow).toEqual(
      expect.arrayContaining([
        "/app/",
        "/api/",
        "/e/",
        "/checkout",
        "/onboarding",
        "/invite",
        "/verify-email",
        "/reset-password",
        "/poll",
      ]),
    );
    expect(result.sitemap).toBe("https://bananasplit.app/sitemap.xml");
  });

  it("leaves the sitemap line out when production has no app URL", () => {
    production("");
    expect(siteOrigin()).toBeNull();
    expect(robots().sitemap).toBeUndefined();
  });
});

describe("sitemap.xml", () => {
  it("lists the public pages on the app's origin", () => {
    production("https://bananasplit.app/");
    expect(sitemap().map((entry) => entry.url)).toEqual([
      "https://bananasplit.app",
      "https://bananasplit.app/sign-in",
      "https://bananasplit.app/sign-up",
      "https://bananasplit.app/privacy",
    ]);
  });

  it("is empty rather than wrong when production has no app URL", () => {
    production("");
    expect(sitemap()).toEqual([]);
  });

  it("never throws for a malformed app URL", () => {
    production("not a url");
    expect(siteOrigin()).toBeNull();
  });
});
