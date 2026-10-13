import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/brand/site-origin";

/**
 * robots.txt: the public pages may be crawled; the app, its API and the
 * one-time or private links (invites, email confirmations, password
 * resets, checkout, polls, event links under /e/) may not. Those pages
 * check access themselves; this only keeps crawlers off them. /app/ and
 * /api/ keep their slash, or the rule would also cover /apple-icon.png.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/rsvp", "/sign-in", "/sign-up"],
      disallow: [
        "/app/",
        "/api/",
        "/e/",
        "/checkout",
        "/onboarding",
        "/invite",
        "/verify-email",
        "/reset-password",
        "/poll",
      ],
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
