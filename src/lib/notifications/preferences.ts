import { NotificationType } from "@/generated/prisma/enums";

import type {
  NotificationPreferences,
  NotificationPreferencesPatch,
} from "./preferences.schema";

export type {
  NotificationPreferences,
  NotificationPreferencesPatch,
} from "./preferences.schema";

/**
 * Notification preferences, shape v2 (Phase 2 in the spec order; Phase 6
 * reads it for reminders and digests). Stored in User.emailPreferences:
 *
 *   {
 *     v: 2,
 *     types: { [NotificationType]: boolean },   // email on/off per type
 *     digest: { enabled: false, hourLocal: 8 },  // daily task digest
 *     reminderLeadDays: 1,                       // due-date reminder lead
 *   }
 *
 * The old shape was a flat map ({ TASK_DUE_SOON: false }). Every read goes
 * through parseNotificationPreferences(), which upgrades a flat map on the
 * fly and repairs anything malformed field by field, so no migration is
 * needed and a bad value never breaks a page or a job. Writes always store
 * the full v2 object.
 *
 * Semantics:
 * - A type missing from `types` is enabled (opt-out), so adding a new type
 *   never silently unsubscribes anyone.
 * - The daily digest is opt-in: `digest.enabled` defaults to false and is
 *   the only switch for TASK_DIGEST (a missing key must not opt everyone in).
 * - hourLocal is in the user's effective timezone (User.timezone, else the
 *   org's; see src/lib/profile/timezone.ts).
 *
 * Pure and client-safe: the zod schemas, the upgrade parser and the checked
 * patch are in ./preferences.schema (server only), so the profile form
 * never ships zod to the browser.
 */

export const NOTIFICATION_TYPES = Object.values(NotificationType) as NotificationType[];

export const DIGEST_HOUR_DEFAULT = 8;
export const REMINDER_LEAD_DAYS_DEFAULT = 1;
export const REMINDER_LEAD_DAYS_MAX = 14;

/** Types that stay off until the user turns them on (Tasks). */
export const DEFAULT_OFF_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.TASK_COMMENTED,
]);

export type TypePreferences = NotificationPreferences["types"];

export function defaultNotificationPreferences(): NotificationPreferences {
  return {
    v: 2,
    types: {},
    digest: { enabled: false, hourLocal: DIGEST_HOUR_DEFAULT },
    reminderLeadDays: REMINDER_LEAD_DAYS_DEFAULT,
    collaboratorReminders: false,
  };
}

/**
 * Whether `type` should also be emailed. TASK_DIGEST follows digest.enabled;
 * DEFAULT_OFF_TYPES stay off until the user opts in; everything else is
 * opt-out.
 */
export function emailEnabledFor(preferences: NotificationPreferences, type: NotificationType): boolean {
  if (type === NotificationType.TASK_DIGEST) {
    return preferences.digest.enabled && preferences.types[type] !== false;
  }
  const explicit = preferences.types[type];
  if (explicit !== undefined) return explicit;
  return !DEFAULT_OFF_TYPES.has(type);
}

/**
 * A patch merged onto the current value, without validation: what the
 * profile form shows straight away. The server runs
 * applyNotificationPreferencesPatch (./preferences.schema), which checks the
 * result against the stored shape before it is written.
 */
export function mergeNotificationPreferencesPatch(
  current: NotificationPreferences,
  patch: NotificationPreferencesPatch,
): NotificationPreferences {
  const types: TypePreferences = { ...current.types, ...(patch.types ?? {}) };
  // TASK_DIGEST has one switch: digest.enabled.
  delete types[NotificationType.TASK_DIGEST];
  return {
    v: 2,
    types,
    digest: {
      enabled: patch.digest?.enabled ?? current.digest.enabled,
      hourLocal: patch.digest?.hourLocal ?? current.digest.hourLocal,
    },
    reminderLeadDays: patch.reminderLeadDays ?? current.reminderLeadDays,
    collaboratorReminders: patch.collaboratorReminders ?? current.collaboratorReminders,
  };
}

export type NotificationGroup = "tasks" | "events" | "org";

export interface NotificationTypeMeta {
  label: string;
  group: NotificationGroup;
  /** Who normally receives it, when not everyone. */
  audience?: string;
}

/**
 * Labels for the per-type email switches. TASK_DIGEST is not listed: the
 * digest has its own switch and hour.
 */
export const NOTIFICATION_TYPE_META: Record<
  Exclude<NotificationType, "TASK_DIGEST">,
  NotificationTypeMeta
> = {
  TASK_ASSIGNED: { label: "A task is assigned to me", group: "tasks" },
  TASK_MENTIONED: { label: "Someone @mentions me in a task or comment", group: "tasks" },
  TASK_COMMENTED: { label: "Someone comments on a task I own", group: "tasks" },
  TASK_DUE_REMINDER: { label: "A reminder before one of my tasks is due", group: "tasks" },
  TASK_DUE_TODAY: { label: "One of my tasks is due today", group: "tasks" },
  TASK_OVERDUE: { label: "One of my tasks is overdue", group: "tasks" },
  TASK_DUE_SOON: { label: "One of my tasks is due soon", group: "tasks" },
  TASK_FLAGGED: {
    label: "A task assignment needs my review",
    group: "tasks",
    audience: "Leads",
  },
  WEEKLY_UPDATE_REMINDER: { label: "Reminder to post my Sunday update", group: "tasks" },
  EVENT_INVITE: { label: "I'm invited to an event", group: "events" },
  EVENT_UPDATED: { label: "An event I'm going to changes", group: "events" },
  EVENT_CANCELLED: { label: "An event I'm going to is cancelled", group: "events" },
  INVITE_ACCEPTED: { label: "Someone accepts an invite I sent", group: "org" },
  INTEGRATION_ERROR: {
    label: "An integration stops working",
    group: "org",
    audience: "Owners and admins",
  },
  SECURITY_ALERT: {
    label: "Security alerts, such as an integration key changing",
    group: "org",
    audience: "Owners",
  },
};

export const NOTIFICATION_GROUP_LABELS: Record<NotificationGroup, string> = {
  tasks: "Tasks",
  events: "Events",
  org: "Organization",
};
