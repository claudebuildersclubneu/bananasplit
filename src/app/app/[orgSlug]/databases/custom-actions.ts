"use server";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { ForbiddenError, NotFoundError } from "@/lib/auth/errors";
import {
  addField,
  archiveDatabase,
  createDatabase,
  createRecord,
  DatabaseInputError,
  deleteField,
  importDatabase,
  moveField,
  purgeRecords,
  restoreRecords,
  trashRecords,
  updateCell,
  updateDatabaseSettings,
  updateField,
  type Actor,
  type CustomRecord,
  type ImportSummary,
} from "@/server/databases/custom";
import { AppError } from "@/server/db/errors";
import { withOrgAction, type OrgContext } from "@/server/db/context";
import type { FieldDef, StoredValue } from "@/lib/databases/fields";

/**
 * Server Actions of club-made databases (src/server/databases/custom.ts).
 * Each runs as the member (withOrgAction: app_user, RLS) and returns
 * { error } for anything expected; the grid calls updateCell on every edit,
 * which is how a database saves itself.
 */

export interface Result<T = undefined> {
  error?: string;
  data?: T;
}

function actor(ctx: OrgContext): Actor {
  return { db: ctx.db, organizationId: ctx.organizationId, userId: ctx.userId, role: ctx.role };
}

function failure(error: unknown): { error: string } {
  unstable_rethrow(error);
  if (error instanceof DatabaseInputError) return { error: error.message };
  if (error instanceof NotFoundError)
    return { error: "That database or row no longer exists, or you can't see it." };
  if (error instanceof ForbiddenError) return { error: "You don't have permission to do that." };
  if (error instanceof AppError) return { error: error.message };
  // RLS refusing a write surfaces as a database error: say so plainly.
  const message = error instanceof Error ? error.message : "";
  if (/row-level security|permission denied/i.test(message)) {
    return { error: "You can view this database but not change it." };
  }
  console.error("[databases] action failed", error);
  return { error: "Something went wrong saving that. Try again." };
}

function action<Args extends unknown[], T>(fn: (a: Actor, ...args: Args) => Promise<T>) {
  const tx = withOrgAction(async (ctx: OrgContext, ...args: Args) => fn(actor(ctx), ...args));
  return async (organizationId: string, ...args: Args): Promise<Result<T>> => {
    try {
      return { data: await tx(organizationId, ...args) };
    } catch (error) {
      return failure(error);
    }
  };
}

const id = z.string().min(1).max(100);
const ids = z.array(id).min(1).max(1000);

const newDatabase = z.object({
  name: z.string().max(200),
  description: z.string().max(2000).nullish(),
  templateId: z.string().max(40).optional(),
});

export const createDatabaseAction = action(async (a, input: unknown) => {
  const parsed = newDatabase.safeParse(input);
  if (!parsed.success) throw new DatabaseInputError("Check the database's name.");
  return createDatabase(a, parsed.data);
});

export const importDatabaseAction = action(async (a, input: unknown): Promise<ImportSummary> => {
  const parsed = z
    .object({ name: z.string().max(200), csv: z.string().max(4_500_000) })
    .safeParse(input);
  if (!parsed.success) throw new DatabaseInputError("That file is too big (4 MB at most).");
  return importDatabase(a, parsed.data);
});

const settings = z.object({
  name: z.string().max(200),
  description: z.string().max(2000).nullable(),
  memberVisibility: z.enum(["MEMBERS", "ADMINS", "OWNER", "HIDDEN"]),
  memberCanEdit: z.boolean(),
});

export const updateDatabaseSettingsAction = action(
  async (a, databaseId: string, input: unknown) => {
    const parsed = settings.safeParse(input);
    if (!parsed.success || !id.safeParse(databaseId).success)
      throw new DatabaseInputError("Check the settings.");
    await updateDatabaseSettings(a, databaseId, parsed.data);
  },
);

export const archiveDatabaseAction = action(async (a, databaseId: string) => {
  await archiveDatabase(a, id.parse(databaseId));
});

const fieldInput = z.object({
  name: z.string().max(200).optional(),
  type: z.string().max(40).optional(),
  options: z.unknown().optional(),
});

export const addFieldAction = action(
  async (a, databaseId: string, input: unknown): Promise<FieldDef> => {
    const parsed = fieldInput.safeParse(input);
    if (!parsed.success) throw new DatabaseInputError("Check the field.");
    return addField(a, id.parse(databaseId), {
      name: parsed.data.name ?? "",
      type: parsed.data.type ?? "TEXT",
      options: parsed.data.options,
    });
  },
);

export const updateFieldAction = action(
  async (a, fieldId: string, input: unknown): Promise<FieldDef> => {
    const parsed = fieldInput.safeParse(input);
    if (!parsed.success) throw new DatabaseInputError("Check the field.");
    return updateField(a, id.parse(fieldId), parsed.data);
  },
);

export const deleteFieldAction = action(async (a, fieldId: string) => {
  await deleteField(a, id.parse(fieldId));
});

export const moveFieldAction = action(async (a, fieldId: string, direction: -1 | 1) => {
  await moveField(a, id.parse(fieldId), direction === -1 ? -1 : 1);
});

export const createRecordAction = action(
  async (a, databaseId: string, values?: Record<string, unknown>): Promise<CustomRecord> =>
    createRecord(a, id.parse(databaseId), values ?? {}),
);

export const updateCellAction = action(
  async (a, recordId: string, fieldId: string, value: unknown): Promise<StoredValue | null> =>
    updateCell(a, id.parse(recordId), id.parse(fieldId), value),
);

export const trashRecordsAction = action(async (a, databaseId: string, recordIds: string[]) =>
  trashRecords(a, id.parse(databaseId), ids.parse(recordIds)),
);

export const restoreRecordsAction = action(async (a, databaseId: string, recordIds: string[]) =>
  restoreRecords(a, id.parse(databaseId), ids.parse(recordIds)),
);

export const purgeRecordsAction = action(
  async (a, databaseId: string, recordIds: string[] | "all") =>
    purgeRecords(a, id.parse(databaseId), recordIds === "all" ? "all" : ids.parse(recordIds)),
);
