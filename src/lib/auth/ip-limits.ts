/**
 * Per-IP limits for sign-up, sign-in and joining a club with its code.
 *
 * A club signs up together: a whole room on campus Wi-Fi reaches the app
 * from one public IP address. The per-IP limits are there to slow a script
 * creating accounts or guessing passwords from one machine, so they are set
 * for a full room rather than for one person; the per-email limits (unchanged)
 * still stop anyone hammering a single account, and every new account must
 * verify its email before it can join anything.
 *
 * Override per deployment, e.g. for a large event:
 *   SIGNUP_LIMIT_PER_IP_HOUR   (default 40 sign-ups per IP per hour)
 *   SIGNIN_LIMIT_PER_IP_15MIN  (default 120 sign-in attempts per IP per 15 minutes)
 *   JOIN_CODE_MISSES_PER_IP_HOUR (default 60 club codes per IP per hour that
 *     match no club; a code that works never counts, so a room joining with
 *     the same code only spends its typos)
 */

type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;

function positiveInt(raw: string | undefined, fallback: number, max: number): number {
  const n = Number((raw ?? "").trim());
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
}

export function signUpPerIpLimit(env: Env = process.env): number {
  return positiveInt(env.SIGNUP_LIMIT_PER_IP_HOUR, 40, 1000);
}

export function signInPerIpLimit(env: Env = process.env): number {
  return positiveInt(env.SIGNIN_LIMIT_PER_IP_15MIN, 120, 2000);
}

export function joinCodeMissesPerIpLimit(env: Env = process.env): number {
  return positiveInt(env.JOIN_CODE_MISSES_PER_IP_HOUR, 60, 1000);
}
