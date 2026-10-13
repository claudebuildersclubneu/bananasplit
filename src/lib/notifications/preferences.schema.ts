import "server-only";

import { z } from "zod";

import { NotificationType } from "@/generated/prisma/enums";

import {
  defaultNotificationPreferences,
  DIGEST_HOUR_DEFAULT,
  mergeNotificationPreferencesPatch,
  NOTIFICATION_TYPES,
  REMINDER_LEAD_DAYS_DEFAULT,
  REMINDER_LEAD_DAYS_MAX,
  type TypePreferences,
} from "./preferences";

/**
 * The zod side of notification preferences (see ./preferences for the
 * shape and its semantics): the stored v2 schema, the upgrade parser every
 * read goes through, and the profile form's patch. Server only, so the form
 * never ships zod to the browser.
 */

export const digestHourSchema = z.number().int().min(0).max(23);
export const reminderLeadDaysSchema = z.number().int().min(0).max(REMINDER_LEAD_DAYS_MAX);

/** The stored v2 shape (strict: what every write must satisfy). */
export const notificationPreferencesSchema = z
  .object({
    v: z.literal(2),
    types: z.partialRecord(z.enum(NotificationType), z.boolean()),
    digest: z.object({ enabled: z.boolean(), hourLocal: digestHourSchema }).strict(),
    reminderLeadDays: reminderLeadDaysSchema,
    // Reminders for tasks the user only collaborates on (Tasks): opt-in.
    collaboratorReminders: z.boolean(),
  })
  .strict();

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

/** Keeps only known NotificationType keys whose value is a boolean. */
function knownTypeBooleans(map: Record<string, unknown>): TypePreferences {
  const out: TypePreferences = {};
  for (const type of NOTIFICATION_TYPES) {
    const value = map[type];
    if (typeof value === "boolean") out[type] = value;
  }
  return out;
}

const objectMap = z.record(z.string(), z.unknown());

/**
 * A v2 value; each field falls back to its default on its own. Top-level
 * type keys are read too: a legacy writer could spread a flat map onto a v2
 * object, and that opt-out must not be lost (it wins over `types`).
 */
const v2Input = z
  .object({
    v: z.literal(2),
    types: objectMap.transform(knownTypeBooleans).catch({}),
    digest: z
      .object({
        enabled: z.boolean().catch(false),
        hourLocal: digestHourSchema.catch(DIGEST_HOUR_DEFAULT),
      })
      .catch({ enabled: false, hourLocal: DIGEST_HOUR_DEFAULT }),
    reminderLeadDays: reminderLeadDaysSchema.catch(REMINDER_LEAD_DAYS_DEFAULT),
    collaboratorReminders: z.boolean().catch(false),
  })
  .passthrough()
  .transform((value) => ({
    ...value,
    types: { ...value.types, ...knownTypeBooleans(value as Record<string, unknown>) },
  }));

/** The pre-v2 flat map ({ TASK_DUE_SOON: false }), upgraded. */
const v1Input = objectMap.transform((flat): NotificationPreferences => {
  const types = knownTypeBooleans(flat);
  return {
    ...defaultNotificationPreferences(),
    types,
    // A v1 { TASK_DIGEST: true } counts as opting into the daily digest.
    digest: {
      enabled: types[NotificationType.TASK_DIGEST] === true,
      hourLocal: DIGEST_HOUR_DEFAULT,
    },
  };
});

/**
 * The upgrade parser: v2 as is (repaired field by field), a flat v1 map
 * upgraded to v2, anything else (null, arrays, strings) the defaults.
 */
export const notificationPreferencesParser = z
  .union([v2Input, v1Input])
  .transform((value): NotificationPreferences => ({
    v: 2,
    types: value.types,
    digest: { enabled: value.digest.enabled, hourLocal: value.digest.hourLocal },
    reminderLeadDays: value.reminderLeadDays,
    collaboratorReminders: value.collaboratorReminders ?? false,
  }))
  .catch(() => defaultNotificationPreferences());

/** Reads User.emailPreferences in any shape it has ever had. Never throws. */
export function parseNotificationPreferences(raw: unknown): NotificationPreferences {
  return notificationPreferencesParser.parse(raw);
}

/** A partial update from the profile form. */
export const notificationPreferencesPatchSchema = z
  .object({
    types: z.partialRecord(z.enum(NotificationType), z.boolean()).optional(),
    digest: z
      .object({ enabled: z.boolean().optional(), hourLocal: digestHourSchema.optional() })
      .strict()
      .optional(),
    reminderLeadDays: reminderLeadDaysSchema.optional(),
    collaboratorReminders: z.boolean().optional(),
  })
  .strict();

export type NotificationPreferencesPatch = z.infer<typeof notificationPreferencesPatchSchema>;

/** Applies a validated patch; the result is always a complete, checked v2 value. */
export function applyNotificationPreferencesPatch(
  current: NotificationPreferences,
  patch: NotificationPreferencesPatch,
): NotificationPreferences {
  return notificationPreferencesSchema.parse(mergeNotificationPreferencesPatch(current, patch));
}
