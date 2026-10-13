/**
 * Turbopack loader (next.config.ts, browser code inside @sentry/* only).
 *
 * Sentry's SDK checks the build flag __SENTRY_TRACING__ so a bundler can
 * drop its tracing code; Sentry's own option for it (treeshake.removeTracing)
 * only works with webpack and applies to the server too. The app keeps
 * tracing on the server but does not use it in the browser, so this sets the
 * flag to false in browser bundles only, and the minifier removes the
 * tracing integration. Error reporting is untouched.
 */
module.exports = function sentryNoBrowserTracing(source) {
  return source.replace(/\b__SENTRY_TRACING__\b/g, "false");
};
