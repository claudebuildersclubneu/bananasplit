import { PLAN_LIMITS, PLAN_NAMES } from "@/lib/billing/features";
import { CLUB_PLANS, PERSONAL_PLANS } from "@/lib/billing/plans";
import { formatStorage } from "@/lib/billing/storage";

/**
 * The four plans as the pricing table and checkout show them (redesign
 * guide 11.1): two for one person, two for a club. Names, prices and
 * limits all come from src/lib/billing, which the app's own plan page and
 * upload checks read too, so the page can't promise something the app
 * doesn't do.
 *
 * Checkout keeps its old query values: ?plan=club is Team and
 * ?plan=society is Team Advanced; ?plan=plus is Personal Plus.
 */

export type TierId = "free" | "plus" | "club" | "society";

const TIER_PLAN = {
  free: "FREE",
  plus: "PERSONAL_PLUS",
  club: "CLUB",
  society: "SOCIETY",
} as const satisfies Record<TierId, keyof typeof PLAN_LIMITS>;

/** Personal Plus: $4 a month, or $36 a year (three months free). */
export const PERSONAL_PLUS = {
  perMonth: PERSONAL_PLANS.plus.perMonth,
  perYear: PERSONAL_PLANS.plus.perYear,
} as const;

export const TIER_NAMES: Record<TierId, string> = {
  free: PLAN_NAMES.FREE,
  plus: PLAN_NAMES.PERSONAL_PLUS,
  club: PLAN_NAMES.CLUB,
  society: PLAN_NAMES.SOCIETY,
};

export interface TierLimits {
  storage: string;
  largestFile: string;
  noteHistory: string;
  members: string;
}

function days(n: number): string {
  if (n % 365 === 0) return n === 365 ? "1 year" : `${n / 365} years`;
  return n === 1 ? "1 day" : `${n} days`;
}

function limitsFor(tier: TierId): TierLimits {
  const l = PLAN_LIMITS[TIER_PLAN[tier]];
  return {
    storage: formatStorage(l.storageBytes),
    largestFile: formatStorage(l.maxFileBytes),
    noteHistory: days(l.noteHistoryDays),
    members: l.members === null ? "Unlimited" : String(l.members),
  };
}

export const TIER_LIMITS: Record<TierId, TierLimits> = {
  free: limitsFor("free"),
  plus: limitsFor("plus"),
  club: limitsFor("club"),
  society: limitsFor("society"),
};

/** What a club plan costs per member per semester. */
export function perMemberRate(plan: "club" | "society"): number {
  return CLUB_PLANS[plan].perMemberPerSemester;
}
