import "server-only";

import { z } from "zod";

import { AMOUNT_SIGNS } from "@/lib/finance/import/mapping";

import { IMPORT_KINDS } from "./finance-sheet";

/**
 * The finance import's zod schemas: what the model must answer for a
 * spreadsheet (a column mapping and labels) or a document (the records),
 * and what the browser may send about a spreadsheet. Server only: the
 * import screens use the zod-free ./finance-sheet.
 */

const column = z.number().int().nullable();

export const SheetReadOutput = z.object({
  sheetKind: z.enum(["transactions", "budget", "other"]),
  headerRow: z.number().int().nullable(),
  columns: z.object({
    date: column,
    description: column,
    amount: column,
    moneyIn: column,
    moneyOut: column,
    type: column,
    category: column,
    counterparty: column,
    paymentMethod: column,
    allocated: column,
  }),
  notesColumns: z.array(z.number().int()),
  amountSign: z.enum(AMOUNT_SIGNS),
  typeIn: z.array(z.string()),
  typeOut: z.array(z.string()),
  dateOrder: z.enum(["MDY", "DMY", "YMD"]),
  labels: z.array(
    z.object({
      column: z.number().int(),
      value: z.string(),
      category: z.string().nullable(),
      kind: z.enum(IMPORT_KINDS).nullable(),
    }),
  ),
  notes: z.array(z.string()),
});
export type SheetReadOutputData = z.infer<typeof SheetReadOutput>;

export const DocumentReadOutput = z.object({
  sheetKind: z.enum(["transactions", "budget", "other"]),
  records: z.array(
    z.object({
      date: z.string().nullable(),
      description: z.string(),
      amount: z.string(),
      direction: z.enum(["IN", "OUT"]),
      kind: z.enum(IMPORT_KINDS).nullable(),
      category: z.string().nullable(),
      counterparty: z.string().nullable(),
    }),
  ),
  budget: z.array(z.object({ category: z.string(), allocated: z.string() })),
  notes: z.array(z.string()),
});
export type DocumentReadOutputData = z.infer<typeof DocumentReadOutput>;

/** What the browser sends about a spreadsheet: a sample of rows and each text column's distinct values. */
export const SheetSample = z.object({
  fileName: z.string().max(200).optional(),
  sheetName: z.string().max(200).optional(),
  width: z.number().int().min(1).max(60),
  rows: z
    .array(z.object({ i: z.number().int().min(0), cells: z.array(z.string().max(200)).max(60) }))
    .min(1)
    .max(60),
  values: z
    .array(
      z.object({
        column: z.number().int().min(0).max(59),
        header: z.string().max(200),
        values: z.array(z.string().max(120)).max(150),
      }),
    )
    .max(20),
});
export type SheetSampleData = z.infer<typeof SheetSample>;
