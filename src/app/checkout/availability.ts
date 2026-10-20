/**
 * Whether checkout exists on this deployment. Its card fields are a visual
 * stand-in for Stripe's Payment Element, so on production the page 404s
 * until billing is connected (BILLING_ENABLED=true) and nobody types a real
 * card number into our own inputs. The pricing table asks too, so it only
 * links to checkout where checkout is.
 */
export function checkoutAvailable(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV !== "production" || env.BILLING_ENABLED === "true";
}
