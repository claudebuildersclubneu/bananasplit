import { CLUB_PLANS } from "@/lib/billing/plans";

/**
 * The four plans as the pricing table and checkout show them (redesign
 * guide 11.1): two for one person, two for a club. The club rates come
 * from src/lib/billing/plans.ts, which billing reads too; the names,
 * limits and Personal Plus's price live here until billing knows the new
 * plans (the guide moves them to PLAN_LIMITS in src/lib/billing/features.ts).
 *
 * Checkout keeps its old query values: ?plan=club is Team and
 * ?plan=society is Team Advanced; ?plan=plus is Personal Plus.
 */

export type TierId = "free" | "plus" | "club" | "society";

/** Personal Plus: $4 a month, or $36 a year (three months free). */
export const PERSONAL_PLUS = { perMonth: 4, perYear: 36 } as const;

export const TIER_NAMES: Record<TierId, string> = {
  free: "Personal Free",
  plus: "Personal Plus",
  club: "Team",
  society: "Team Advanced",
};

export interface TierLimits {
  storage: string;
  largestFile: string;
  noteHistory: string;
  members: string;
}

export const TIER_LIMITS: Record<TierId, TierLimits> = {
  free: { storage: "1 GB", largestFile: "10 MB", noteHistory: "7 days", members: "1" },
  plus: { storage: "25 GB", largestFile: "250 MB", noteHistory: "1 year", members: "1" },
  club: { storage: "100 GB", largestFile: "250 MB", noteHistory: "90 days", members: "Unlimited" },
  society: { storage: "500 GB", largestFile: "1 GB", noteHistory: "1 year", members: "Unlimited" },
};

/** What a club plan costs per member per semester. */
export function perMemberRate(plan: "club" | "society"): number {
  return CLUB_PLANS[plan].perMemberPerSemester;
}
