import "server-only";

import { z } from "zod";

import { BOARD_COLUMNS, MAX_HEIGHT, MAX_WIDGETS, MIN_HEIGHT } from "./index";

/**
 * What the save action accepts for a board. Apart from ./index so the board
 * itself, a client component, never ships zod to the browser.
 */
export const boardInputSchema = z
  .array(
    z
      .object({
        id: z.string().regex(/^[a-z0-9-]{1,40}$/),
        type: z.string().max(40),
        w: z.number().int().min(1).max(BOARD_COLUMNS),
        h: z.number().int().min(MIN_HEIGHT).max(MAX_HEIGHT).nullable(),
      })
      .strict(),
  )
  .max(MAX_WIDGETS);
