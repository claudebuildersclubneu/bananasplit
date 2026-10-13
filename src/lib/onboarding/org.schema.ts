import "server-only";

import { z } from "zod";

import { FINANCE_CARD_IDS } from "@/lib/finance/dashboard-cards";
import { LABEL_COLOR_PALETTE } from "@/lib/label-colors";

import { MAX_SETUP_LABELS, MAX_TEAMS } from "./org";

/**
 * The org-setup (Flow B) checks the Server Actions run. Apart from ./org so
 * the step forms, which only need its lists and helpers, never ship zod to
 * the browser.
 */

// ---------------------------------------------------------------- B3 labels

export const taskLabelsInputSchema = z
  .object({
    labels: z
      .array(
        z
          .object({
            /** An existing label's id; null for a new one. */
            id: z.string().min(1).max(100).nullable(),
            name: z
              .string()
              .transform((s) => s.replace(/\s+/g, " ").trim())
              .pipe(
                z
                  .string()
                  .min(1, "Give every label a name.")
                  .max(40, "Keep label names under 40 characters."),
              ),
            color: z.enum(LABEL_COLOR_PALETTE),
          })
          .strict(),
      )
      .max(
        MAX_SETUP_LABELS,
        `Add up to ${MAX_SETUP_LABELS} labels here. You can add more in the Admin panel.`,
      ),
  })
  .strict();

export type TaskLabelsInput = z.input<typeof taskLabelsInputSchema>;

// ---------------------------------------------------------------- B4 finance

export const financeInputSchema = z
  .object({
    cards: z
      .array(z.enum(FINANCE_CARD_IDS as [string, ...string[]]))
      .min(1, "Keep at least one report.")
      .max(10),
    /** 1-12: the month the fiscal year starts on the 1st of. */
    fiscalYearStartMonth: z.number().int().min(1).max(12),
    /** Create the budget period for the current fiscal year. */
    createPeriod: z.boolean(),
  })
  .strict();

export type FinanceInput = z.input<typeof financeInputSchema>;

// ---------------------------------------------------------------- B5 teams

const meetingSchema = z
  .object({
    /** 0 = Monday. */
    day: z.number().int().min(0).max(6),
    /** Minutes after midnight, on the quarter hour. */
    minutes: z
      .number()
      .int()
      .min(0)
      .max(23 * 60 + 45)
      .multipleOf(15),
    cadence: z.enum(["weekly", "biweekly"]),
  })
  .strict();

export const teamsInputSchema = z
  .object({
    teams: z
      .array(
        z
          .object({
            name: z
              .string()
              .transform((s) => s.replace(/\s+/g, " ").trim())
              .pipe(
                z
                  .string()
                  .min(1, "Name every team.")
                  .max(80, "Keep team names under 80 characters."),
              ),
            leadUserId: z.string().min(1).max(100).nullable(),
            meeting: meetingSchema.nullable(),
          })
          .strict(),
      )
      .min(1, "Add at least one team.")
      .max(MAX_TEAMS, `Add at most ${MAX_TEAMS} teams.`),
    addMeetingsToCalendar: z.boolean(),
    showMemberAvailability: z.boolean(),
  })
  .strict();

export type TeamsInput = z.input<typeof teamsInputSchema>;
export type TeamInput = TeamsInput["teams"][number];
export type MeetingInput = z.input<typeof meetingSchema>;
