import type { OrgPlan } from "@/generated/prisma/enums";

/**
 * What each priced plan includes (docs/features/personal-and-clubs.md). The
 * pricing table (src/components/marketing/pricing.tsx) and Admin panel >
 * Plan read planIncludes(); the app itself asks spaceIncludes()
 * (src/lib/billing/space.ts), which also knows Personal spaces and trials.
 * Change the pricing table with this.
 *
 *   FREE     Personal, every account's own space: RSVP pages, tasks (every
 *            view, for one person), the calendar and availability polls,
 *            and its own settings. Never a club's plan.
 *   CLUB     the club workspace: the overview, weekly updates,
 *            labels, files, people and the org chart, finance, databases
 *            and reports, and data connections.
 *   SOCIETY  everything, plus themes, AI, sponsorships, website sync and
 *            the audit log. A club's 30-day trial (TRIAL) is Society.
 *
 * Plans are ordered, so a feature names the cheapest plan that has it.
 */

/**
 * The plans a price is shown for (TRIAL is a club's first 30 days of
 * Society). PERSONAL_PLUS isn't priced yet: a Personal space has FREE's
 * features on either Personal plan (src/lib/billing/space.ts).
 */
export type PricedPlan = Exclude<OrgPlan, "TRIAL" | "PERSONAL_PLUS">;

export const PLAN_ORDER = ["FREE", "CLUB", "SOCIETY"] as const satisfies readonly PricedPlan[];

export const PLAN_FEATURES = {
  /** Calendar events and their public RSVP pages, check-in and reminders. */
  rsvp: "FREE",
  /** Tasks. */
  tasks: "FREE",
  /** Board, Week and Table, and the calendar's Tasks layer. */
  taskViews: "FREE",
  /** Availability polls and question polls. */
  polls: "FREE",
  /** Settings: general and the danger zone (a club adds members, invitations and its plan). */
  admin: "FREE",

  /** The Overview board of widgets (Personal has its own home). */
  overview: "CLUB",
  /** Weekly updates: work between people. */
  teamwork: "CLUB",
  /** Shared task labels (Admin panel > Labels). */
  labels: "CLUB",
  /** Live notes, documents and uploads. */
  files: "CLUB",
  /** The member directory, profiles and the org chart. */
  people: "CLUB",
  /** The finance board, budget, transactions and reimbursements. */
  finance: "CLUB",
  /** Databases with CSV import (attendance, sign-ups, votes). */
  databases: "CLUB",
  /** Reports over the club's databases. */
  reports: "CLUB",
  /** Data connections: Google Calendar sync, an email sender, a data source, guided setup. */
  integrations: "CLUB",
  /** Arranging the sidebar (Admin panel > Sidebar). */
  sidebar: "CLUB",
  /** Ballot privacy, member visibility and the public events feed. */
  privacy: "CLUB",

  /** Custom colors, logo display and the light or dark default. */
  themes: "SOCIETY",
  /** Claude and other AI models: tasks and events from text, sorting data. */
  ai: "SOCIETY",
  /** Sponsorship tracking and runway. */
  sponsorships: "SOCIETY",
  /** Website sync for events and sign-ups (the build hook). */
  websiteSync: "SOCIETY",
  /** Every settings change: who made it and when. */
  auditLog: "SOCIETY",
} as const satisfies Record<string, PricedPlan>;

export type PlanFeature = keyof typeof PLAN_FEATURES;

/** Quantities the pricing table promises (not enforced yet: see the report). */
export const PLAN_LIMITS: Record<PricedPlan, { storageGb: number; dataConnections: number }> = {
  FREE: { storageGb: 0, dataConnections: 0 },
  CLUB: { storageGb: 25, dataConnections: 2 },
  SOCIETY: { storageGb: 100, dataConnections: 6 },
};

export const PLAN_NAMES: Record<OrgPlan, string> = {
  FREE: "Personal",
  PERSONAL_PLUS: "Personal Plus",
  TRIAL: "Trial",
  CLUB: "Club",
  SOCIETY: "Society",
};

/** What an owner picks for a club when (or before) its trial ends. */
export const CLUB_PLAN_CHOICES = ["CLUB", "SOCIETY"] as const satisfies readonly PricedPlan[];
export type ClubPlanChoice = (typeof CLUB_PLAN_CHOICES)[number];

export function isClubPlanChoice(value: unknown): value is ClubPlanChoice {
  return typeof value === "string" && (CLUB_PLAN_CHOICES as readonly string[]).includes(value);
}

/** A priced plan's name (FREE, CLUB or SOCIETY). */
export function isOrgPlan(value: unknown): value is PricedPlan {
  return typeof value === "string" && (PLAN_ORDER as readonly string[]).includes(value);
}

function rank(plan: PricedPlan): number {
  return PLAN_ORDER.indexOf(plan);
}

/** Whether `plan` includes `feature` (pricing; the app asks spaceIncludes). */
export function planIncludes(plan: PricedPlan, feature: PlanFeature): boolean {
  return rank(plan) >= rank(PLAN_FEATURES[feature]);
}

/** The cheapest plan that includes `feature`. */
export function planFor(feature: PlanFeature): PricedPlan {
  return PLAN_FEATURES[feature];
}

/** Every feature `plan` includes. */
export function featuresOf(plan: PricedPlan): PlanFeature[] {
  return (Object.keys(PLAN_FEATURES) as PlanFeature[]).filter((f) => planIncludes(plan, f));
}

/** What a locked feature is called on the upgrade screen ("Finance is on the Club plan"). */
export const FEATURE_LABELS: Record<PlanFeature, string> = {
  rsvp: "RSVP pages",
  tasks: "Tasks",
  taskViews: "Board, Week and Table views",
  polls: "Polls",
  admin: "Settings",
  overview: "The Overview",
  teamwork: "Weekly updates",
  labels: "Task labels",
  files: "Files",
  people: "People and the org chart",
  finance: "Finance",
  databases: "Databases",
  reports: "Reports",
  integrations: "Data connections",
  sidebar: "Arranging the sidebar",
  privacy: "Privacy settings",
  themes: "Custom themes",
  ai: "AI",
  sponsorships: "Sponsorship tracking",
  websiteSync: "Website sync",
  auditLog: "The audit log",
};

/** One line on what the feature does, under the upgrade screen's title. */
export const FEATURE_PITCH: Record<PlanFeature, string> = {
  rsvp: "Event pages with sign-ups, waitlists, reminders and check-in.",
  tasks: "A list of what needs doing, and by when.",
  taskViews: "Move work along on a board, plan the week and bulk-edit in a table.",
  polls: "Find a time that works for everyone, or ask anything.",
  admin: "Your name, time zone and the rest of your settings.",
  overview: "Each member's home page: their tasks, meetings, pins and recent pages.",
  teamwork: "Post a weekly update to your team, on the day your club picks.",
  labels: "A shared label palette for sorting tasks.",
  files: "Live notes, documents and uploads in one place.",
  people: "A member directory with profiles, and an org chart for your officers.",
  finance: "A budget, transactions and reimbursements your treasurer can run.",
  databases: "Attendance, sign-ups and votes, with CSV import.",
  reports: "Charts and summaries from your club's databases.",
  integrations: "Google Calendar sync, your own email sender and your website's data.",
  sidebar: "Choose which sections your club uses, their order and their names.",
  privacy: "Ballot privacy, who sees member emails, and the public events feed.",
  themes: "Your club's colors and logo across the app.",
  ai: "Turn notes into tasks and events, and let AI sort your data.",
  sponsorships: "Track sponsors, what they promised and your runway.",
  websiteSync: "Publish events and sign-ups to your club website.",
  auditLog: "Every settings change: who made it and when.",
};
