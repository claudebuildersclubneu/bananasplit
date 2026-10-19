import type { OrgKind, OrgPlan } from "@/generated/prisma/enums";

import {
  FEATURE_LABELS,
  isPluralFeature,
  personalPlanFor,
  PLAN_LIMITS,
  PLAN_NAMES,
  planIncludes,
  type PlanFeature,
  type PlanLimits,
  type PricedPlan,
} from "./features";

/**
 * What a space (a Personal space or a club) can use right now, the one
 * place the app asks (docs/features/personal-and-clubs.md). Pure and
 * client-safe; the pricing table keeps asking planIncludes().
 *
 *   PERSONAL          its plan, Personal Free (FREE) or Personal Plus
 *                     (src/lib/billing/features.ts): tasks, the calendar
 *                     and RSVP pages, polls, notes and files, settings;
 *                     Plus adds themes, calendar sync and AI.
 *   TRIAL, running    everything (Team Advanced), for 30 days from the
 *                     club's start, with Team Advanced's limits.
 *   TRIAL, ended      "paused": everything can still be opened and read
 *                     (Team Advanced minus what runs on its own: AI and
 *                     website sync), but nothing in the club can be created
 *                     or changed until the owner picks Team or Team
 *                     Advanced (canWriteSpace; withOrgAction refuses the
 *                     writes, and so does the upload gate).
 *   CLUB, SOCIETY     that plan (Team, Team Advanced).
 *
 *   spaceIncludes(org, "finance")      // gate a page, a link, an action
 *   spaceLimits(org)                   // storage, largest file, note history
 *   spaceStatus(org)                   // "personal" | "trial" | "paused" | "paid"
 *   trialDaysLeft(org)                 // Settings › Plan, the trial banner
 */

/** The three columns of Organization that decide what a space includes. */
export interface SpaceInfo {
  kind: OrgKind;
  plan: OrgPlan;
  /** TRIAL only: when the trial ends. */
  trialEndsAt: Date | null;
}

/** How long a new club's trial runs. */
export const TRIAL_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SpaceStatus = "personal" | "trial" | "paused" | "paid";

/** When a club started at `now` ends its trial. */
export function trialEndsAtFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + TRIAL_DAYS * DAY_MS);
}

export function isPersonalSpace(space: Pick<SpaceInfo, "kind">): boolean {
  return space.kind === "PERSONAL";
}

/** Where the space stands: Personal, a running trial, paused (trial over), or paid. */
export function spaceStatus(space: SpaceInfo, now: Date = new Date()): SpaceStatus {
  if (space.kind === "PERSONAL") return "personal";
  if (space.plan === "TRIAL") {
    return space.trialEndsAt && space.trialEndsAt.getTime() <= now.getTime() ? "paused" : "trial";
  }
  return "paid";
}

/** A club whose trial ended before the owner picked a plan. */
export function isPaused(space: SpaceInfo, now: Date = new Date()): boolean {
  return spaceStatus(space, now) === "paused";
}

/** Whether members may create or change the space's content (not paused). */
export function canWriteSpace(space: SpaceInfo, now: Date = new Date()): boolean {
  return !isPaused(space, now);
}

/** Whole days left in a trial (0 on its last day or after), or null when not on one. */
export function trialDaysLeft(space: SpaceInfo, now: Date = new Date()): number | null {
  if (space.kind !== "CLUB" || space.plan !== "TRIAL" || !space.trialEndsAt) return null;
  return Math.max(0, Math.ceil((space.trialEndsAt.getTime() - now.getTime()) / DAY_MS));
}

/** The priced plan whose features and limits the space has (a trial is Team Advanced). */
export function effectivePlan(space: Pick<SpaceInfo, "kind" | "plan">): PricedPlan {
  if (space.kind === "PERSONAL") return space.plan === "PERSONAL_PLUS" ? "PERSONAL_PLUS" : "FREE";
  // A club is never on a Personal plan (the database refuses it).
  if (space.plan === "TRIAL" || space.plan === "FREE" || space.plan === "PERSONAL_PLUS") {
    return "SOCIETY";
  }
  return space.plan;
}

/** What a paused club stops doing: the features that act on their own. */
const PAUSED_OFF: ReadonlySet<PlanFeature> = new Set(["ai", "websiteSync"]);

/** Whether the space includes `feature` right now. */
export function spaceIncludes(
  space: SpaceInfo,
  feature: PlanFeature,
  now: Date = new Date(),
): boolean {
  if (space.kind === "PERSONAL") return planIncludes(effectivePlan(space), feature);
  if (isPaused(space, now) && PAUSED_OFF.has(feature)) return false;
  return planIncludes(effectivePlan(space), feature);
}

/** The space's limits: its plan's; a trial's are Team Advanced's (paused or not). */
export function spaceLimits(space: Pick<SpaceInfo, "kind" | "plan">): PlanLimits {
  return PLAN_LIMITS[effectivePlan(space)];
}

/** What a refused write says in a paused club (members never see a price). */
export const PAUSED_WRITE_MESSAGE =
  "This club is paused, so nothing can be added or changed for now. Your officers have been asked to choose a plan.";

/** What a refused action says when the space doesn't include its feature. */
export function featureRefusal(space: Pick<SpaceInfo, "kind">, feature: PlanFeature): string {
  const plural = isPluralFeature(feature);
  if (space.kind === "PERSONAL") {
    return personalPlanFor(feature) === "PERSONAL_PLUS"
      ? `${FEATURE_LABELS[feature]} ${plural ? "come" : "comes"} with ${PLAN_NAMES.PERSONAL_PLUS}.`
      : `${FEATURE_LABELS[feature]} ${plural ? "are" : "is"} for clubs. Start a club or join one to use it.`;
  }
  return `${FEATURE_LABELS[feature]} ${plural ? "aren't" : "isn't"} on this club's plan.`;
}

/**
 * What withOrgAction returns instead of running an action the space refuses
 * (src/server/db/context.ts): a paused club, or a feature the space lacks.
 * Shaped like the actions' own `{ error }` results, so forms show `error`.
 */
export interface SpaceRefusal {
  ok: false;
  error: string;
  refused: "paused" | "feature";
}

export function isSpaceRefusal(value: unknown): value is SpaceRefusal {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === false &&
    ((value as { refused?: unknown }).refused === "paused" ||
      (value as { refused?: unknown }).refused === "feature")
  );
}

/**
 * Why `space` refuses an action, or null when it may run: `feature` the
 * action belongs to (if any), and whether it writes club content (a paused
 * club refuses those; reads, choosing a plan, leaving and deleting run).
 */
export function spaceRefusal(
  space: SpaceInfo,
  options: { feature?: PlanFeature; whenPaused?: "refuse" | "allow" },
  now: Date = new Date(),
): SpaceRefusal | null {
  if (options.feature && !spaceIncludes(space, options.feature, now)) {
    return { ok: false, error: featureRefusal(space, options.feature), refused: "feature" };
  }
  if ((options.whenPaused ?? "refuse") === "refuse" && isPaused(space, now)) {
    return { ok: false, error: PAUSED_WRITE_MESSAGE, refused: "paused" };
  }
  return null;
}
