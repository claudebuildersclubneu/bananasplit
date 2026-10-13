import * as Sentry from "@sentry/nextjs";

import { scrubBreadcrumb, scrubSentryEvent } from "@/lib/observability/scrub";

// Same no-DSN-means-disabled behavior as src/instrumentation.ts, and the same
// scrubber: browser events carry URLs (invite and feed tokens live in paths)
// and breadcrumbs that must be redacted before they are sent.
//
// Errors only, no tracing: nothing reads browser performance data, and the
// tracing code is compiled out of browser bundles (next.config.ts), which
// takes it off every page's JavaScript. The server still traces
// (src/instrumentation.ts). With no tracesSampleRate there are no browser
// transactions, so there is no onRouterTransitionStart hook either.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
  beforeBreadcrumb: scrubBreadcrumb,
});
