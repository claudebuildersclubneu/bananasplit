import { Prisma, type MemberVisibility, type Role } from "@/generated/prisma/client";
import { can } from "@/lib/auth/permissions";
import { NotFoundError } from "@/lib/auth/errors";
import {
  choiceId,
  CHOICE_COLORS,
  convertValue,
  fieldOptionsSchema,
  FIELD_TYPES,
  hasChoices,
  inferFieldType,
  LIMITS,
  parseCell,
  readOptions,
  type FieldDef,
  type FieldOptions,
  type FieldType,
  type StoredValue,
} from "@/lib/databases/fields";
import { DATABASE_TEMPLATES, findTemplate } from "@/lib/databases/templates";
import { writeOrgAuditLog } from "@/server/audit";
import type { TxClient } from "@/server/db/context";

import { parseCsv } from "./csv-import";

/**
 * Club-made databases (DatabaseDefinition kind CUSTOM; docs/features/
 * databases.md "Your own databases"). Everything runs in the caller's
 * transaction as the member (withOrgTx / withOrgAction), so RLS is the
 * guard: app.can_view_database decides who reads a database, and
 * app.can_edit_database who adds and edits its rows. The checks here only
 * turn a refusal into a clear message first.
 *
 * Every cell is checked against its field (src/lib/databases/fields.ts)
 * and merged into the row on its own, so the grid saves each edit as it
 * happens and two people editing different cells never undo each other.
 */

export class DatabaseInputError extends Error {}

export interface Actor {
  db: TxClient;
  organizationId: string;
  userId: string;
  role: Role;
}

function requireManage(actor: Actor): void {
  if (!can({ role: actor.role }, "databases.write")) {
    throw new DatabaseInputError(
      "Only owners and admins can change a database's fields and settings.",
    );
  }
}

// ---- Reading --------------------------------------------------------------

export interface CustomRecord {
  id: string;
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  updatedByName: string | null;
  deletedAt: string | null;
}

export interface CustomDatabase {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  memberVisibility: MemberVisibility;
  memberCanEdit: boolean;
  fields: FieldDef[];
  records: CustomRecord[];
  trashCount: number;
  /** Add and edit rows (app.can_edit_database). */
  canEdit: boolean;
  /** Fields, settings, deleting for good (owners and admins). */
  canManage: boolean;
  /** More rows than the page loads. */
  truncated: boolean;
}

/** Rows a page loads at once; the export reads them all. */
export const PAGE_ROWS = 5_000;

async function allowed(db: TxClient, fn: "can_view_database" | "can_edit_database", id: string) {
  const rows =
    fn === "can_view_database"
      ? await db.$queryRaw<{ ok: boolean }[]>`SELECT app.can_view_database(${id}) AS ok`
      : await db.$queryRaw<{ ok: boolean }[]>`SELECT app.can_edit_database(${id}) AS ok`;
  return rows[0]?.ok === true;
}

function toFieldDef(f: {
  id: string;
  name: string;
  type: string;
  options: unknown;
  isPrimary: boolean;
}): FieldDef {
  return {
    id: f.id,
    name: f.name,
    type: f.type as FieldType,
    options: readOptions(f.options),
    isPrimary: f.isPrimary,
  };
}

const FIELD_SELECT = { id: true, name: true, type: true, options: true, isPrimary: true } as const;

async function loadFields(
  db: TxClient,
  organizationId: string,
  databaseId: string,
): Promise<FieldDef[]> {
  const rows = await db.databaseField.findMany({
    where: { organizationId, databaseId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: FIELD_SELECT,
  });
  return rows.map(toFieldDef);
}

/** One club-made database by its URL key, as the viewer may see it; NotFoundError otherwise. */
export async function loadCustomDatabase(
  actor: Actor,
  key: string,
  options: { trash?: boolean } = {},
): Promise<CustomDatabase> {
  const { db, organizationId } = actor;
  const def = await db.databaseDefinition.findFirst({
    where: { organizationId, key, kind: "CUSTOM", archivedAt: null },
  });
  if (!def || !(await allowed(db, "can_view_database", def.id))) throw new NotFoundError();
  const fields = await loadFields(db, organizationId, def.id);
  const where = {
    organizationId,
    databaseId: def.id,
    deletedAt: options.trash ? { not: null } : null,
  };
  const rows = await db.databaseRecord.findMany({
    where,
    orderBy: options.trash ? [{ deletedAt: "desc" }] : [{ createdAt: "asc" }, { id: "asc" }],
    take: PAGE_ROWS + 1,
    select: {
      id: true,
      values: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
    },
  });
  const trashCount = await db.databaseRecord.count({
    where: { organizationId, databaseId: def.id, deletedAt: { not: null } },
  });
  return {
    id: def.id,
    key: def.key,
    name: def.name,
    description: def.description,
    icon: def.icon,
    memberVisibility: def.memberVisibility,
    memberCanEdit: def.memberCanEdit,
    fields,
    records: rows.slice(0, PAGE_ROWS).map((r) => ({
      id: r.id,
      values: (r.values ?? {}) as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      createdByName: r.createdBy?.name ?? null,
      updatedByName: r.updatedBy?.name ?? null,
      deletedAt: r.deletedAt?.toISOString() ?? null,
    })),
    trashCount,
    canEdit: await allowed(db, "can_edit_database", def.id),
    canManage: can({ role: actor.role }, "databases.write"),
    truncated: rows.length > PAGE_ROWS,
  };
}

async function memberIds(db: TxClient, organizationId: string): Promise<Set<string>> {
  const rows = await db.membership.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}

async function liveDefinition(actor: Actor, databaseId: string) {
  const def = await actor.db.databaseDefinition.findFirst({
    where: {
      id: databaseId,
      organizationId: actor.organizationId,
      kind: "CUSTOM",
      archivedAt: null,
    },
    select: { id: true, key: true, name: true },
  });
  if (!def || !(await allowed(actor.db, "can_view_database", def.id))) throw new NotFoundError();
  return def;
}

// ---- Creating a database --------------------------------------------------

/** Types the field that names rows may have. */
const PRIMARY_TYPES = new Set<FieldType>(["TEXT", "NUMBER", "EMAIL", "PHONE", "URL"]);

const RESERVED_KEYS = new Set(["reports", "new", "import", "export", "trash", "settings"]);

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-|-$/g, "");
  return base || "database";
}

async function uniqueKey(db: TxClient, organizationId: string, name: string): Promise<string> {
  const base = slugify(name);
  const taken = new Set(
    (
      await db.databaseDefinition.findMany({
        where: { organizationId, key: { startsWith: base } },
        select: { key: true },
      })
    ).map((d) => d.key),
  );
  for (let n = 1; n < 1000; n++) {
    const key = n === 1 ? base : `${base}-${n}`;
    if (!taken.has(key) && !RESERVED_KEYS.has(key)) return key;
  }
  throw new DatabaseInputError("Pick a different name.");
}

function cleanName(name: string, what: string): string {
  const s = name.trim().replace(/\s+/g, " ");
  if (!s) throw new DatabaseInputError(`Give the ${what} a name.`);
  if (s.length > 60) throw new DatabaseInputError(`Keep the ${what}'s name under 60 characters.`);
  return s;
}

async function insertDefinition(
  actor: Actor,
  input: { name: string; description?: string | null; icon: string },
) {
  const { db, organizationId, userId } = actor;
  const count = await db.databaseDefinition.count({
    where: { organizationId, kind: "CUSTOM", archivedAt: null },
  });
  if (count >= LIMITS.databasesPerClub) {
    throw new DatabaseInputError(
      `A club can have up to ${LIMITS.databasesPerClub} databases. Archive one first.`,
    );
  }
  const name = cleanName(input.name, "database");
  const last = await db.databaseDefinition.aggregate({
    where: { organizationId },
    _max: { sortOrder: true },
  });
  return db.databaseDefinition.create({
    data: {
      organizationId,
      key: await uniqueKey(db, organizationId, name),
      name,
      description: input.description?.trim().slice(0, 500) || null,
      icon: input.icon,
      kind: "CUSTOM",
      memberVisibility: "MEMBERS",
      allowEdits: true,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
      createdById: userId,
    },
    select: { id: true, key: true },
  });
}

/** A new database from a template (blank by default). Owners and admins. */
export async function createDatabase(
  actor: Actor,
  input: { name: string; description?: string | null; templateId?: string },
): Promise<{ key: string }> {
  requireManage(actor);
  const template = findTemplate(input.templateId ?? "blank") ?? DATABASE_TEMPLATES[0]!;
  const def = await insertDefinition(actor, {
    name: input.name || template.defaultName,
    // A template's own line describes it until the club writes one.
    description: input.description ?? (template.id === "blank" ? null : template.description),
    icon: template.icon,
  });
  await actor.db.databaseField.createMany({
    data: template.fields.map((f, i) => ({
      organizationId: actor.organizationId,
      databaseId: def.id,
      name: f.name,
      type: f.type,
      isPrimary: i === 0,
      sortOrder: i,
      options: {
        ...(f.choices ? { choices: f.choices.map((c) => ({ id: choiceId(), ...c })) } : {}),
        ...(f.decimals !== undefined ? { decimals: f.decimals } : {}),
      },
    })),
  });
  await writeOrgAuditLog(actor.db, {
    organizationId: actor.organizationId,
    action: "database.created",
    targetType: "DatabaseDefinition",
    targetId: def.id,
    diff: { template: template.id },
  });
  return { key: def.key };
}

export interface ImportSummary {
  key: string;
  rows: number;
  fields: number;
  skippedCells: number;
}

/**
 * A new database from a spreadsheet (CSV): one field per column, its type
 * inferred from the values (a column of yes/no becomes a checkbox, a few
 * repeated words a single select...), one row per line. A value that
 * doesn't fit its column's type is left empty and counted.
 */
export async function importDatabase(
  actor: Actor,
  input: { name: string; csv: string },
): Promise<ImportSummary> {
  requireManage(actor);
  const table = parseCsv(input.csv).filter((r) => r.some((c) => c.trim() !== ""));
  if (table.length < 2)
    throw new DatabaseInputError("The file needs a header row and at least one row of data.");
  const [header, ...lines] = table;
  if (lines.length > LIMITS.recordsPerDatabase) {
    throw new DatabaseInputError(
      `That's more than ${LIMITS.recordsPerDatabase.toLocaleString()} rows. Split the file.`,
    );
  }
  const columns = header!.slice(0, LIMITS.fieldsPerDatabase).map((h, i) => ({
    index: i,
    name: (h.trim() || `Column ${i + 1}`).slice(0, 60),
  }));
  // Duplicate headers get a number, so every field has its own name.
  const seen = new Map<string, number>();
  for (const c of columns) {
    const n = (seen.get(c.name.toLowerCase()) ?? 0) + 1;
    seen.set(c.name.toLowerCase(), n);
    if (n > 1) c.name = `${c.name.slice(0, 55)} ${n}`;
  }

  const def = await insertDefinition(actor, {
    name: input.name || "Imported data",
    icon: "Table2",
  });
  const fields: FieldDef[] = [];
  for (const [i, c] of columns.entries()) {
    const samples = lines.map((l) => l[c.index] ?? "");
    // The first column names the rows, so it stays text.
    const type: FieldType = i === 0 ? "TEXT" : inferFieldType(samples);
    let options: FieldOptions = {};
    if (hasChoices(type)) {
      const labels = [...new Set(samples.map((s) => s.trim()).filter(Boolean))].slice(
        0,
        LIMITS.choicesPerField,
      );
      options = {
        choices: labels.map((label, j) => ({
          id: choiceId(),
          label: label.slice(0, 80),
          color: CHOICE_COLORS[(j + 1) % CHOICE_COLORS.length]!,
        })),
      };
    }
    if (type === "NUMBER") options = { decimals: 2 };
    const created = await actor.db.databaseField.create({
      data: {
        organizationId: actor.organizationId,
        databaseId: def.id,
        name: c.name,
        type,
        options,
        isPrimary: i === 0,
        sortOrder: i,
      },
      select: FIELD_SELECT,
    });
    fields.push(toFieldDef(created));
  }

  let skippedCells = 0;
  const data = lines.map((line) => {
    const values: Record<string, StoredValue> = {};
    for (const [i, f] of fields.entries()) {
      const raw = line[columns[i]!.index] ?? "";
      if (!raw.trim()) continue;
      const parsed = parseCell(f, raw);
      if (parsed.ok && parsed.value !== null) values[f.id] = parsed.value;
      else if (!parsed.ok) skippedCells++;
    }
    return {
      organizationId: actor.organizationId,
      databaseId: def.id,
      values,
      createdById: actor.userId,
      updatedById: actor.userId,
    };
  });
  for (let i = 0; i < data.length; i += 500) {
    await actor.db.databaseRecord.createMany({ data: data.slice(i, i + 500) });
  }
  await writeOrgAuditLog(actor.db, {
    organizationId: actor.organizationId,
    action: "database.imported",
    targetType: "DatabaseDefinition",
    targetId: def.id,
    diff: { rows: data.length, fields: fields.length },
  });
  return { key: def.key, rows: data.length, fields: fields.length, skippedCells };
}

// ---- Settings ---------------------------------------------------------------

export async function updateDatabaseSettings(
  actor: Actor,
  databaseId: string,
  input: {
    name: string;
    description: string | null;
    memberVisibility: MemberVisibility;
    memberCanEdit: boolean;
  },
): Promise<void> {
  requireManage(actor);
  await liveDefinition(actor, databaseId);
  await actor.db.databaseDefinition.update({
    where: { id: databaseId },
    data: {
      name: cleanName(input.name, "database"),
      description: input.description?.trim().slice(0, 500) || null,
      memberVisibility: input.memberVisibility,
      memberCanEdit: input.memberCanEdit,
    },
  });
  await writeOrgAuditLog(actor.db, {
    organizationId: actor.organizationId,
    action: "database.settings_changed",
    targetType: "DatabaseDefinition",
    targetId: databaseId,
    diff: { memberVisibility: input.memberVisibility, memberCanEdit: input.memberCanEdit },
  });
}

/** Archives a database: hidden everywhere, its data kept (and in the owner's export). */
export async function archiveDatabase(actor: Actor, databaseId: string): Promise<void> {
  requireManage(actor);
  await liveDefinition(actor, databaseId);
  await actor.db.databaseDefinition.update({
    where: { id: databaseId },
    data: { archivedAt: new Date() },
  });
  await writeOrgAuditLog(actor.db, {
    organizationId: actor.organizationId,
    action: "database.archived",
    targetType: "DatabaseDefinition",
    targetId: databaseId,
  });
}

// ---- Fields -----------------------------------------------------------------

function checkOptions(type: FieldType, raw: unknown): FieldOptions {
  const parsed = fieldOptionsSchema.safeParse(raw ?? {});
  if (!parsed.success) throw new DatabaseInputError("Those field options aren't valid.");
  const out: FieldOptions = {};
  if (hasChoices(type)) {
    const labels = new Set<string>();
    out.choices = (parsed.data.choices ?? []).filter((c) => {
      const k = c.label.toLowerCase();
      if (labels.has(k)) return false;
      labels.add(k);
      return true;
    });
  }
  if (type === "NUMBER" && parsed.data.decimals !== undefined) out.decimals = parsed.data.decimals;
  return out;
}

async function fieldOf(actor: Actor, fieldId: string) {
  const field = await actor.db.databaseField.findFirst({
    where: { id: fieldId, organizationId: actor.organizationId },
    select: { ...FIELD_SELECT, databaseId: true, sortOrder: true },
  });
  if (!field) throw new NotFoundError();
  await liveDefinition(actor, field.databaseId);
  return field;
}

export async function addField(
  actor: Actor,
  databaseId: string,
  input: { name: string; type: string; options?: unknown },
): Promise<FieldDef> {
  requireManage(actor);
  await liveDefinition(actor, databaseId);
  const type = FIELD_TYPES.find((t) => t === input.type);
  if (!type) throw new DatabaseInputError("Pick a field type.");
  const count = await actor.db.databaseField.count({
    where: { organizationId: actor.organizationId, databaseId },
  });
  if (count >= LIMITS.fieldsPerDatabase) {
    throw new DatabaseInputError(`A database can have up to ${LIMITS.fieldsPerDatabase} fields.`);
  }
  const last = await actor.db.databaseField.aggregate({
    where: { organizationId: actor.organizationId, databaseId },
    _max: { sortOrder: true },
  });
  const created = await actor.db.databaseField.create({
    data: {
      organizationId: actor.organizationId,
      databaseId,
      name: cleanName(input.name, "field"),
      type,
      options: checkOptions(type, input.options) as Prisma.InputJsonObject,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
      isPrimary: count === 0,
    },
    select: FIELD_SELECT,
  });
  return toFieldDef(created);
}

/**
 * Renames a field, changes its options or its type. A type change converts
 * every row's value (what still fits is kept); removing a choice clears it
 * from the rows that had it.
 */
export async function updateField(
  actor: Actor,
  fieldId: string,
  input: { name?: string; type?: string; options?: unknown },
): Promise<FieldDef> {
  requireManage(actor);
  const before = await fieldOf(actor, fieldId);
  const beforeDef = toFieldDef(before);
  const type = input.type ? FIELD_TYPES.find((t) => t === input.type) : beforeDef.type;
  if (!type) throw new DatabaseInputError("Pick a field type.");
  if (before.isPrimary && type !== beforeDef.type && !PRIMARY_TYPES.has(type)) {
    throw new DatabaseInputError(
      "The first field names your rows; keep it text, a number, an email, a phone or a link.",
    );
  }
  let options = input.options !== undefined ? checkOptions(type, input.options) : beforeDef.options;
  // Turning text into a select: its distinct values become the choices.
  if (hasChoices(type) && !hasChoices(beforeDef.type) && !options.choices?.length) {
    const rows = await actor.db.databaseRecord.findMany({
      where: { organizationId: actor.organizationId, databaseId: before.databaseId },
      select: { values: true },
    });
    const labels = new Set<string>();
    for (const r of rows) {
      const v = (r.values as Record<string, unknown>)[fieldId];
      const text = typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
      for (const part of type === "MULTI_SELECT" ? text.split(/[,;]/) : [text]) {
        if (part.trim()) labels.add(part.trim().slice(0, 80));
      }
      if (labels.size >= LIMITS.choicesPerField) break;
    }
    options = {
      choices: [...labels].map((label, j) => ({
        id: choiceId(),
        label,
        color: CHOICE_COLORS[(j + 1) % CHOICE_COLORS.length]!,
      })),
    };
  }
  const after: FieldDef = {
    ...beforeDef,
    name: input.name !== undefined ? cleanName(input.name, "field") : beforeDef.name,
    type,
    options,
  };

  const typeChanged = type !== beforeDef.type;
  const removedChoices =
    hasChoices(type) && hasChoices(beforeDef.type)
      ? (beforeDef.options.choices ?? [])
          .filter((c) => !(options.choices ?? []).some((n) => n.id === c.id))
          .map((c) => c.id)
      : [];
  if (typeChanged || removedChoices.length > 0) {
    const members = await memberIds(actor.db, actor.organizationId);
    const rows = await actor.db.databaseRecord.findMany({
      where: { organizationId: actor.organizationId, databaseId: before.databaseId },
      select: { id: true, values: true },
    });
    for (const r of rows) {
      const values = r.values as Record<string, unknown>;
      if (!(fieldId in values)) continue;
      const old = values[fieldId];
      let next: StoredValue | null;
      if (typeChanged) {
        next = convertValue(beforeDef, after, old, members);
      } else {
        const kept = parseCell(after, old, members);
        next = kept.ok ? kept.value : null;
      }
      if (JSON.stringify(next) === JSON.stringify(old)) continue;
      await setCell(actor.db, actor.organizationId, r.id, fieldId, next, actor.userId);
    }
  }
  const saved = await actor.db.databaseField.update({
    where: { id: fieldId },
    data: { name: after.name, type, options: options as Prisma.InputJsonObject },
    select: FIELD_SELECT,
  });
  return toFieldDef(saved);
}

/** Deletes a field and its values from every row. The field that names rows stays. */
export async function deleteField(actor: Actor, fieldId: string): Promise<void> {
  requireManage(actor);
  const field = await fieldOf(actor, fieldId);
  if (field.isPrimary)
    throw new DatabaseInputError(
      "The first field names your rows, so it can't be deleted. Rename it instead.",
    );
  await actor.db.$executeRaw`
    UPDATE "DatabaseRecord" SET "values" = "values" - ${fieldId}::text, "updatedAt" = now()
     WHERE "organizationId" = ${actor.organizationId} AND "databaseId" = ${field.databaseId}
       AND "values" ? ${fieldId}::text`;
  await actor.db.databaseField.delete({ where: { id: fieldId } });
  await writeOrgAuditLog(actor.db, {
    organizationId: actor.organizationId,
    action: "database.field_deleted",
    targetType: "DatabaseDefinition",
    targetId: field.databaseId,
    diff: { field: field.name, type: field.type },
  });
}

/** Moves a field one place left or right (the field that names rows stays first). */
export async function moveField(actor: Actor, fieldId: string, direction: -1 | 1): Promise<void> {
  requireManage(actor);
  const field = await fieldOf(actor, fieldId);
  if (field.isPrimary) return;
  const order = (await loadFields(actor.db, actor.organizationId, field.databaseId)).filter(
    (f) => !f.isPrimary,
  );
  const i = order.findIndex((f) => f.id === fieldId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j]!, order[i]!];
  for (const [k, f] of order.entries()) {
    await actor.db.databaseField.update({ where: { id: f.id }, data: { sortOrder: k + 1 } });
  }
}

// ---- Rows -------------------------------------------------------------------

/**
 * Sets one cell: merges it into the row (or removes the key when empty), so
 * concurrent edits to other cells of the row stand. RLS decides who may.
 */
async function setCell(
  db: TxClient,
  organizationId: string,
  recordId: string,
  fieldId: string,
  value: StoredValue | null,
  userId: string,
): Promise<number> {
  return value === null
    ? db.$executeRaw`
        UPDATE "DatabaseRecord"
           SET "values" = "values" - ${fieldId}::text, "updatedById" = ${userId}, "updatedAt" = now()
         WHERE "id" = ${recordId} AND "organizationId" = ${organizationId}`
    : db.$executeRaw`
        UPDATE "DatabaseRecord"
           SET "values" = "values" || jsonb_build_object(${fieldId}::text, ${JSON.stringify(value)}::jsonb),
               "updatedById" = ${userId}, "updatedAt" = now()
         WHERE "id" = ${recordId} AND "organizationId" = ${organizationId}`;
}

async function requireEdit(actor: Actor, databaseId: string): Promise<void> {
  if (!(await allowed(actor.db, "can_edit_database", databaseId))) {
    throw new DatabaseInputError("You can view this database but not edit it.");
  }
}

/** A new row, optionally with values (each checked). */
export async function createRecord(
  actor: Actor,
  databaseId: string,
  values: Record<string, unknown> = {},
): Promise<CustomRecord> {
  await liveDefinition(actor, databaseId);
  await requireEdit(actor, databaseId);
  const count = await actor.db.databaseRecord.count({
    where: { organizationId: actor.organizationId, databaseId },
  });
  if (count >= LIMITS.recordsPerDatabase) {
    throw new DatabaseInputError(
      `A database can hold up to ${LIMITS.recordsPerDatabase.toLocaleString()} rows.`,
    );
  }
  const fields = await loadFields(actor.db, actor.organizationId, databaseId);
  const members = await memberIds(actor.db, actor.organizationId);
  const clean: Record<string, StoredValue> = {};
  for (const [fieldId, raw] of Object.entries(values)) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) continue;
    const parsed = parseCell(field, raw, members);
    if (!parsed.ok) throw new DatabaseInputError(`${field.name}: ${parsed.error}`);
    if (parsed.value !== null) clean[fieldId] = parsed.value;
  }
  const row = await actor.db.databaseRecord.create({
    data: {
      organizationId: actor.organizationId,
      databaseId,
      values: clean,
      createdById: actor.userId,
      updatedById: actor.userId,
    },
  });
  return {
    id: row.id,
    values: clean,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByName: null,
    updatedByName: null,
    deletedAt: null,
  };
}

/** Saves one cell (the grid calls this as each edit is made). Returns the stored value. */
export async function updateCell(
  actor: Actor,
  recordId: string,
  fieldId: string,
  value: unknown,
): Promise<StoredValue | null> {
  const field = await actor.db.databaseField.findFirst({
    where: { id: fieldId, organizationId: actor.organizationId },
    select: { ...FIELD_SELECT, databaseId: true },
  });
  if (!field) throw new NotFoundError();
  const record = await actor.db.databaseRecord.findFirst({
    where: {
      id: recordId,
      organizationId: actor.organizationId,
      databaseId: field.databaseId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!record) throw new NotFoundError();
  await requireEdit(actor, field.databaseId);
  const def = toFieldDef(field);
  const members =
    def.type === "MEMBER" ? await memberIds(actor.db, actor.organizationId) : undefined;
  const parsed = parseCell(def, value, members);
  if (!parsed.ok) throw new DatabaseInputError(parsed.error);
  const changed = await setCell(
    actor.db,
    actor.organizationId,
    recordId,
    fieldId,
    parsed.value,
    actor.userId,
  );
  if (changed === 0) throw new DatabaseInputError("You can view this database but not edit it.");
  return parsed.value;
}

/** Moves rows to the trash (restorable). */
export async function trashRecords(
  actor: Actor,
  databaseId: string,
  ids: string[],
): Promise<number> {
  await liveDefinition(actor, databaseId);
  await requireEdit(actor, databaseId);
  const done = await actor.db.databaseRecord.updateMany({
    where: {
      id: { in: ids.slice(0, 1000) },
      organizationId: actor.organizationId,
      databaseId,
      deletedAt: null,
    },
    data: { deletedAt: new Date(), updatedById: actor.userId },
  });
  return done.count;
}

export async function restoreRecords(
  actor: Actor,
  databaseId: string,
  ids: string[],
): Promise<number> {
  await liveDefinition(actor, databaseId);
  await requireEdit(actor, databaseId);
  const done = await actor.db.databaseRecord.updateMany({
    where: {
      id: { in: ids.slice(0, 1000) },
      organizationId: actor.organizationId,
      databaseId,
      deletedAt: { not: null },
    },
    data: { deletedAt: null, updatedById: actor.userId },
  });
  return done.count;
}

/** Deletes rows from the trash for good (owners and admins; RLS allows nobody else). */
export async function purgeRecords(
  actor: Actor,
  databaseId: string,
  ids: string[] | "all",
): Promise<number> {
  requireManage(actor);
  await liveDefinition(actor, databaseId);
  const done = await actor.db.databaseRecord.deleteMany({
    where: {
      organizationId: actor.organizationId,
      databaseId,
      deletedAt: { not: null },
      ...(ids === "all" ? {} : { id: { in: ids.slice(0, 1000) } }),
    },
  });
  if (done.count) {
    await writeOrgAuditLog(actor.db, {
      organizationId: actor.organizationId,
      action: "database.rows_deleted",
      targetType: "DatabaseDefinition",
      targetId: databaseId,
      diff: { rows: done.count },
    });
  }
  return done.count;
}
