import path from "node:path";

import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

import {
  buildStaticCsp,
  cspHeaderName,
  cspMode,
  REPORTING_ENDPOINTS_HEADER,
  STATIC_CSP_SOURCE,
  FRAME_DENY_HEADER,
  NOT_FRAMABLE_SOURCE,
  STATIC_SECURITY_HEADERS,
} from "./src/lib/security/csp";

const nextConfig: NextConfig = {
  // A note's whole body is saved through a Server Action (up to 2M characters
  // of JSON, see src/app/app/[orgSlug]/notes/limits.ts). Next refuses action
  // bodies over 1 MB by default, which broke saving large imported documents.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // Sentry bundle size. Sentry's own switches for this (webpack.treeshake)
  // only reach webpack builds, and this app builds with Turbopack, so the
  // same build flags are set here. __SENTRY_DEBUG__: drop the SDK's debug
  // logging everywhere (nothing turns on its `debug` option). Session Replay
  // is not used, so it is never bundled and needs no flag.
  compiler: { define: { __SENTRY_DEBUG__: false } },
  turbopack: {
    rules: {
      // Browser tracing is not used (instrumentation-client.ts reports errors
      // only), so the tracing flag is false in browser bundles alone; the
      // server keeps its tracing. See the loader for why it is a loader.
      "**/@sentry/**/*.{js,mjs}": {
        condition: { all: ["browser", { content: /__SENTRY_TRACING__/ }] },
        loaders: [path.join(process.cwd(), "scripts/turbopack/sentry-no-browser-tracing.cjs")],
      },
    },
  },
  // 0A Fix 13. Static security headers on every route, plus the static
  // (no-nonce) CSP on every route the proxy does not cover; src/proxy.ts sets
  // the per-request nonce policy on /app, /poll, /invite and the auth pages.
  // These values are fixed when the build runs (CSP_MODE included).
  async headers() {
    return [
      { source: "/:path*", headers: STATIC_SECURITY_HEADERS },
      // Every path but the Notes files route (its PDFs preview in a same-origin frame).
      { source: NOT_FRAMABLE_SOURCE, headers: [FRAME_DENY_HEADER] },
      {
        source: STATIC_CSP_SOURCE,
        headers: [
          { key: cspHeaderName(cspMode()), value: buildStaticCsp() },
          REPORTING_ENDPOINTS_HEADER,
        ],
      },
    ];
  },
};

// Only uploads source maps (and needs auth) when SENTRY_AUTH_TOKEN is set —
// a plain `next build` without it still succeeds, just without that step.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
});
