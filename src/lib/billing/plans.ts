import { PLAN_NAMES } from "./features";

/**
 * Bananasplit's prices: the one place they live (redesign guide 11.1, 20.9
 * a). The pricing section on the home page, checkout and Settings › Plan
 * and storage read from here, and so should the billing provider's price
 * ids once billing is connected. Names come from PLAN_NAMES
 * (src/lib/billing/features.ts), with what each plan includes and its
 * limits.
 *
 * Club plans (Team, Team Advanced) bill per active member per semester;
 * joining members never pay. Personal Plus bills its one person monthly,
 * or yearly at nine months' price.
 *
 * The per-seat team plans (Team $15, Business $25) are retired: they were
 * never sold.
 *
 * The keys are checkout's query values (?plan=club is Team, ?plan=society
 * Team Advanced, ?plan=plus Personal Plus), so they keep their old names.
 */

export const CLUB_PLANS = {
  club: { plan: "CLUB", name: PLAN_NAMES.CLUB, perMemberPerSemester: 4 },
  society: { plan: "SOCIETY", name: PLAN_NAMES.SOCIETY, perMemberPerSemester: 7 },
} as const;

export const PERSONAL_PLANS = {
  free: { plan: "FREE", name: PLAN_NAMES.FREE, perMonth: 0, perYear: 0 },
  plus: { plan: "PERSONAL_PLUS", name: PLAN_NAMES.PERSONAL_PLUS, perMonth: 4, perYear: 36 },
} as const;

export type ClubPlanId = keyof typeof CLUB_PLANS;
export type PersonalPlanId = keyof typeof PERSONAL_PLANS;

export function isClubPlanId(value: unknown): value is ClubPlanId {
  return typeof value === "string" && Object.hasOwn(CLUB_PLANS, value);
}

/** "$4", "$1,200": whole dollars, as the pricing cards print them. */
export function dollars(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
