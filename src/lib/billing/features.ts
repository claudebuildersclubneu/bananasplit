import type { OrgPlan } from "@/generated/prisma/enums";

/**
 * What each club plan includes: the one place the app asks. The sidebar,
 * the Admin panel and every gated page read planIncludes(), and the pricing
 * table (src/components/marketing/pricing.tsx) promises the same thing, so
 * change both together.
 *
 *   FREE     RSVP pages (events, sign-ups, reminders, check-in), a simple
 *            task list, and the Admin panel's basics (general, members and
 *            invitations, the plan, the danger zone).
 *   CLUB     the officer workspace: the overview, every task view, polls,
 *            files, people and the org chart, finance, databases and
 *            reports, and data connections.
 *   SOCIETY  everything, plus themes, AI, sponsorships, website sync and
 *            the audit log.
 *
 * Plans are ordered, so a feature names the cheapest plan that has it.
 */

export const PLAN_ORDER = ["FREE", "CLUB", "SOCIETY"] as const satisfies readonly OrgPlan[];

export const PLAN_FEATURES = {
  /** Calendar events and their public RSVP pages, check-in and reminders. */
  rsvp: "FREE",
  /** Tasks, in the List view. */
  tasks: "FREE",
  /** The Admin panel's general settings, members, invitations and plan. */
  admin: "FREE",

  /** The Overview board of widgets (FREE clubs land on their events). */
  overview: "CLUB",
  /** Board, Week and Table, the calendar's Tasks layer, Requests, Sunday updates. */
  taskViews: "CLUB",
  /** Shared task labels (Admin panel > Labels). */
  labels: "CLUB",
  /** Availability polls and question polls. */
  polls: "CLUB",
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
} as const satisfies Record<string, OrgPlan>;

export type PlanFeature = keyof typeof PLAN_FEATURES;

/** Quantities the pricing table promises (not enforced yet: see the report). */
export const PLAN_LIMITS: Record<OrgPlan, { storageGb: number; dataConnections: number }> = {
  FREE: { storageGb: 0, dataConnections: 0 },
  CLUB: { storageGb: 25, dataConnections: 2 },
  SOCIETY: { storageGb: 100, dataConnections: 6 },
};

export const PLAN_NAMES: Record<OrgPlan, string> = {
  FREE: "Free",
  CLUB: "Club",
  SOCIETY: "Society",
};

export function isOrgPlan(value: unknown): value is OrgPlan {
  return typeof value === "string" && (PLAN_ORDER as readonly string[]).includes(value);
}

function rank(plan: OrgPlan): number {
  return PLAN_ORDER.indexOf(plan);
}

/** Whether `plan` includes `feature`. */
export function planIncludes(plan: OrgPlan, feature: PlanFeature): boolean {
  return rank(plan) >= rank(PLAN_FEATURES[feature]);
}

/** The cheapest plan that includes `feature`. */
export function planFor(feature: PlanFeature): OrgPlan {
  return PLAN_FEATURES[feature];
}

/** Every feature `plan` includes. */
export function featuresOf(plan: OrgPlan): PlanFeature[] {
  return (Object.keys(PLAN_FEATURES) as PlanFeature[]).filter((f) => planIncludes(plan, f));
}

/** What a locked feature is called on the upgrade screen ("Finance is on the Club plan"). */
export const FEATURE_LABELS: Record<PlanFeature, string> = {
  rsvp: "RSVP pages",
  tasks: "Tasks",
  admin: "The Admin panel",
  overview: "The Overview",
  taskViews: "Board, Week and Table views",
  labels: "Task labels",
  polls: "Polls",
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
  tasks: "A simple list of who is doing what.",
  admin: "Members, invitations and your club's settings.",
  overview: "Each member's home page: their tasks, meetings, pins and recent pages.",
  taskViews:
    "Move work along on a board, plan the week, bulk-edit in a table, and run requests and Sunday updates.",
  labels: "A shared label palette for sorting tasks.",
  polls: "Find a time that works for everyone, or ask the club anything.",
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
