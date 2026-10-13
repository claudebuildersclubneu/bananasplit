import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Pricing } from "./pricing";

/**
 * The plan buttons start a club. Signed in, that is club setup itself
 * (sign-up would only bounce them back to the home page); signed out, it is
 * sign-up, carrying club setup as where to go next.
 */

function hrefs(html: string): string[] {
  return [...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>(?:Create your club|Go Society)<\/a>/g)].map(
    (m) => m[1].replace(/&amp;/g, "&"),
  );
}

describe("Pricing", () => {
  it("sends a signed-out visitor to sign-up, on the way to starting a club", () => {
    const html = renderToStaticMarkup(<Pricing signedIn={false} />);
    expect(hrefs(html)).toEqual([
      "/sign-up?callbackUrl=%2Fonboarding%2Forganization",
      "/sign-up?callbackUrl=%2Fonboarding%2Forganization",
    ]);
  });

  it("sends a signed-in visitor straight to club setup", () => {
    const html = renderToStaticMarkup(<Pricing signedIn />);
    expect(hrefs(html)).toEqual(["/onboarding/organization", "/onboarding/organization"]);
  });

  it("names each plan with a heading", () => {
    const html = renderToStaticMarkup(<Pricing />);
    expect(html).toMatch(/<h3[^>]*>Club<\/h3>/);
    expect(html).toMatch(/<h3[^>]*>Society<\/h3>/);
  });
});
