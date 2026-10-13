import "server-only";

import { z } from "zod";

import { PRIORITIES } from "./action-items";

/**
 * What the model must answer for an action-items import: every field
 * present, null when unknown. Server only (the route hands it to the model
 * call); the review dialog uses the zod-free ./action-items.
 */
export const ActionItemsOutput = z.object({
  items: z.array(
    z.object({
      kind: z.enum(["task", "event"]),
      title: z.string(),
      description: z.string().nullable(),
      owner: z.string().nullable(),
      helpers: z.array(z.string()),
      dueDate: z.string().nullable(),
      priority: z.enum(PRIORITIES),
      startsAt: z.string().nullable(),
      endsAt: z.string().nullable(),
      allDay: z.boolean(),
      location: z.string().nullable(),
      sourceText: z.string(),
    }),
  ),
  notes: z.array(z.string()),
});
export type ActionItemsOutputData = z.infer<typeof ActionItemsOutput>;
