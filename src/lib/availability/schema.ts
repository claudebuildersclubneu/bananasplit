import "server-only";

import { z } from "zod";

import { EMPTY_AVAILABILITY, MAX_RULE_LABEL, MAX_RULES } from "./index";

/**
 * The checks on a member's availability (User.availability) the server runs:
 * the Server Action's input and every stored read. Apart from ./index so the
 * grid, which only needs the shapes and helpers, never ships zod to the
 * browser.
 */

const dayIndex = z.number().int().min(0).max(6);
const hour = z.number().int().min(0).max(24);
const label = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1, "Give it a name.")
      .max(MAX_RULE_LABEL, `Keep it under ${MAX_RULE_LABEL} characters.`),
  );

const neverHourRule = z
  .object({ kind: z.literal("never"), scope: z.literal("hour"), hour: hour.max(23) })
  .strict();
const neverDayRule = z
  .object({ kind: z.literal("never"), scope: z.literal("day"), day: dayIndex })
  .strict();
const weeklyRule = z
  .object({
    kind: z.literal("weekly"),
    label,
    days: z.array(dayIndex).min(1, "Pick at least one day.").max(7),
    start: hour.max(23),
    end: hour.min(1),
  })
  .strict()
  .refine((r) => r.end > r.start, { message: "The end must be after the start.", path: ["end"] });
const dateRule = z
  .object({
    kind: z.literal("date"),
    label,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    start: hour.max(23).nullable(),
    end: hour.min(1).nullable(),
  })
  .strict()
  .refine((r) => (r.start === null) === (r.end === null), {
    message: "Give both times, or neither for all day.",
    path: ["end"],
  })
  .refine((r) => r.start === null || r.end === null || r.end > r.start, {
    message: "The end must be after the start.",
    path: ["end"],
  });

export const availabilityRuleSchema = z.union([neverHourRule, neverDayRule, weeklyRule, dateRule]);
export type AvailabilityRule = z.output<typeof availabilityRuleSchema>;

const blockKey = z.string().regex(/^[0-6]-([0-9]|1[0-9]|2[0-3])$/);

export const availabilitySchema = z
  .object({
    v: z.literal(1).optional().default(1),
    blocks: z
      .array(blockKey)
      .max(7 * 24)
      .optional()
      .default([]),
    rules: z
      .array(availabilityRuleSchema)
      .max(MAX_RULES, `Add at most ${MAX_RULES} rules.`)
      .optional()
      .default([]),
  })
  .strict()
  .transform((a) => ({ v: 1 as const, blocks: [...new Set(a.blocks)].sort(), rules: a.rules }));

export type Availability = z.output<typeof availabilitySchema>;

/** A stored value, or empty when it is missing or malformed. Never throws. */
export function parseAvailability(raw: unknown): Availability {
  const parsed = availabilitySchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : EMPTY_AVAILABILITY;
}
