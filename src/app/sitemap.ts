import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/brand/site-origin";

/** The public pages worth indexing. Add /rsvp here once that page exists. */
const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up"] as const;

/**
 * sitemap.xml, on the same origin as the app's emails. Empty when there is
 * no app URL configured: a sitemap pointing at the wrong host is worse than
 * none.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin) return [];
  return PUBLIC_PATHS.map((path) => ({
    url: path === "/" ? origin : `${origin}${path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
