import { appOrigin } from "@/lib/app-url";

type Env = Record<string, string | undefined>;

/**
 * The site's origin for public metadata: metadataBase (the og:image and
 * twitter:image URLs), robots.txt and sitemap.xml. The same origin as
 * emails use (appOrigin), or null when it isn't configured.
 *
 * These are built with the app, so a missing production URL must not fail
 * the build or every page's render: they leave the absolute URLs out
 * instead. Emails still fail loudly through appOrigin.
 */
export function siteOrigin(env: Env = process.env): string | null {
  try {
    return appOrigin(env);
  } catch {
    // AppUrlConfigError, or a NEXT_PUBLIC_APP_URL that isn't a URL.
    return null;
  }
}
