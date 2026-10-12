/**
 * Bananasplit's plans: the one place their names and prices live. The
 * pricing section on the home page and checkout both read from here, and so
 * should the billing provider's price ids once billing is connected.
 *
 * Club plans bill per active member per semester; team plans per seat per
 * month (or yearly at ten months' price).
 */

export const CLUB_PLANS = {
  club: { name: "Club", perMemberPerSemester: 4 },
  society: { name: "Society", perMemberPerSemester: 7 },
} as const;

export const TEAM_PLANS = {
  team: { name: "Team", perSeatPerMonth: 15, perSeatPerYear: 150 },
  business: { name: "Business", perSeatPerMonth: 25, perSeatPerYear: 250 },
} as const;

export type ClubPlanId = keyof typeof CLUB_PLANS;
export type TeamPlanId = keyof typeof TEAM_PLANS;

export function isClubPlanId(value: unknown): value is ClubPlanId {
  return typeof value === "string" && Object.hasOwn(CLUB_PLANS, value);
}

/** "$4", "$1,200": whole dollars, as the pricing cards print them. */
export function dollars(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
