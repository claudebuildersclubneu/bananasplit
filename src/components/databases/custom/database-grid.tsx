"use client";

import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowRight,
  ArrowUpAZ,
  Check,
  CircleAlert,
  Download,
  Loader2,
  Maximize2,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Shapes,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import {
  addFieldAction,
  createRecordAction,
  deleteFieldAction,
  moveFieldAction,
  purgeRecordsAction,
  restoreRecordsAction,
  trashRecordsAction,
  updateCellAction,
  updateFieldAction,
} from "@/app/app/[orgSlug]/databases/custom-actions";
import { BackLink } from "@/components/back-link";
import { ItemMenu } from "@/components/item-menu";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchField } from "@/components/ui/search-field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import {
  choiceId,
  CHOICE_COLORS,
  displayText,
  FIELD_TYPE_META,
  FIELD_TYPES,
  hasChoices,
  type Choice,
  type FieldDef,
  type FieldType,
  type StoredValue,
} from "@/lib/databases/fields";
import { cn } from "@/lib/utils";
import type { CustomDatabase } from "@/server/databases/custom";

import { CellEditor, type Member } from "./cell-editor";
import { ChoicesDialog, FieldNameDialog, NewFieldPopover } from "./field-dialogs";
import { FieldIcon } from "./field-icon";
import { DatabaseSettingsDialog } from "./settings-dialog";

/**
 * A club-made database as a spreadsheet you edit in place. Every change
 * saves on its own (each cell is its own small save, src/server/databases/
 * custom.ts) and the header says when everything is saved. Owners and
 * admins also shape it: fields, choices, settings, the trash.
 */

const WIDTH: Record<FieldType, number> = {
  TEXT: 200,
  LONG_TEXT: 260,
  NUMBER: 120,
  CURRENCY: 130,
  DATE: 160,
  CHECKBOX: 96,
  SELECT: 170,
  MULTI_SELECT: 220,
  MEMBER: 180,
  EMAIL: 220,
  PHONE: 160,
  URL: 200,
};

type Sort = { fieldId: string; dir: 1 | -1 } | null;

function withValue(values: Record<string, unknown>, fieldId: string, value: StoredValue | null) {
  const next = { ...values };
  if (value === null) delete next[fieldId];
  else next[fieldId] = value;
  return next;
}

function csvCell(text: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function DatabaseGrid({
  orgId,
  orgSlug,
  database,
  members,
  trash,
}: {
  orgId: string;
  orgSlug: string;
  database: CustomDatabase;
  members: Member[];
  trash: boolean;
}) {
  const router = useRouter();
  const [confirmEl, confirm] = useConfirm();
  const [fields, setFields] = useState(database.fields);
  const [records, setRecords] = useState(database.records);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<FieldDef | null>(null);
  const [editingChoices, setEditingChoices] = useState<FieldDef | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // A refresh (another tab saved, a type change converted values) replaces
  // the local copy: reset during render when the server's data changes.
  const [fromServer, setFromServer] = useState(database);
  if (fromServer !== database) {
    setFromServer(database);
    setFields(database.fields);
    setRecords(database.records);
  }

  const memberNames = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const primary = fields.find((f) => f.isPrimary) ?? fields[0];
  const canEdit = database.canEdit && !trash;
  const base = `/app/${orgSlug}/databases/${database.key}`;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = records;
    if (q) {
      rows = rows.filter((r) =>
        fields.some((f) => displayText(f, r.values[f.id], memberNames).toLowerCase().includes(q)),
      );
    }
    if (sort) {
      const f = fields.find((x) => x.id === sort.fieldId);
      if (f) {
        const numeric = f.type === "NUMBER" || f.type === "CURRENCY";
        rows = [...rows].sort((a, b) => {
          const av = a.values[f.id];
          const bv = b.values[f.id];
          if (av === undefined && bv === undefined) return 0;
          if (av === undefined) return 1;
          if (bv === undefined) return -1;
          if (numeric) return ((av as number) - (bv as number)) * sort.dir;
          return (
            displayText(f, av, memberNames).localeCompare(
              displayText(f, bv, memberNames),
              undefined,
              { numeric: true, sensitivity: "base" },
            ) * sort.dir
          );
        });
      }
    }
    return rows;
  }, [records, fields, query, sort, memberNames]);

  async function track<T>(work: Promise<{ error?: string; data?: T }>): Promise<T | undefined> {
    setPending((n) => n + 1);
    try {
      const result = await work;
      if (result.error) {
        setFailed(result.error);
        toast({ title: "Not saved", description: result.error });
        return undefined;
      }
      setFailed(null);
      return result.data;
    } finally {
      setPending((n) => n - 1);
    }
  }

  async function saveCell(recordId: string, fieldId: string, value: StoredValue | null) {
    const before = records.find((r) => r.id === recordId)?.values;
    setRecords((rs) =>
      rs.map((r) =>
        r.id === recordId ? { ...r, values: withValue(r.values, fieldId, value) } : r,
      ),
    );
    const saved = await track(updateCellAction(orgId, recordId, fieldId, value));
    if (saved === undefined && before) {
      setRecords((rs) => rs.map((r) => (r.id === recordId ? { ...r, values: before } : r)));
    } else if (saved !== undefined && JSON.stringify(saved) !== JSON.stringify(value)) {
      // The server tidied it (a trimmed space, a rounded cent): show what's stored.
      setRecords((rs) =>
        rs.map((r) =>
          r.id === recordId ? { ...r, values: withValue(r.values, fieldId, saved) } : r,
        ),
      );
    }
  }

  async function addRow() {
    const row = await track(createRecordAction(orgId, database.id, {}));
    if (!row) return;
    setRecords((rs) => [...rs, row]);
    setQuery("");
    setSort(null);
    requestAnimationFrame(() => {
      const cell = tableRef.current?.querySelector<HTMLElement>(
        `[data-row="${row.id}"] [data-primary] [data-cell-input]`,
      );
      cell?.focus();
      cell?.scrollIntoView({ block: "nearest" });
    });
  }

  async function addChoice(field: FieldDef, label: string): Promise<Choice | null> {
    const existing = (field.options.choices ?? []).find(
      (c) => c.label.toLowerCase() === label.toLowerCase(),
    );
    if (existing) return existing;
    const choice: Choice = {
      id: choiceId(),
      label,
      color: CHOICE_COLORS[((field.options.choices?.length ?? 0) + 1) % CHOICE_COLORS.length]!,
    };
    const updated = await track(
      updateFieldAction(orgId, field.id, {
        options: { ...field.options, choices: [...(field.options.choices ?? []), choice] },
      }),
    );
    if (!updated) return null;
    setFields((fs) => fs.map((f) => (f.id === field.id ? updated : f)));
    return choice;
  }

  async function changeType(field: FieldDef, type: FieldType) {
    if (type === field.type) return;
    const hasData = records.some((r) => r.values[field.id] !== undefined);
    if (hasData) {
      const ok = await confirm({
        title: `Change “${field.name}” to ${FIELD_TYPE_META[type].label.toLowerCase()}?`,
        description:
          "Values that fit the new type are kept and converted; the rest are cleared. This can't be undone.",
        confirmLabel: "Change type",
      });
      if (!ok) return;
    }
    const updated = await track(updateFieldAction(orgId, field.id, { type }));
    if (!updated) return;
    setFields((fs) => fs.map((f) => (f.id === field.id ? updated : f)));
    router.refresh();
  }

  async function removeField(field: FieldDef) {
    const ok = await confirm({
      title: `Delete the “${field.name}” field?`,
      description: "Its values in every row are deleted too. This can't be undone.",
      confirmLabel: "Delete field",
      run: async () => (await deleteFieldAction(orgId, field.id)).error,
    });
    if (!ok) return;
    setFields((fs) => fs.filter((f) => f.id !== field.id));
    setRecords((rs) => rs.map((r) => ({ ...r, values: withValue(r.values, field.id, null) })));
  }

  async function move(field: FieldDef, direction: -1 | 1) {
    const i = fields.findIndex((f) => f.id === field.id);
    const j = i + direction;
    if (j < 1 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setFields(next);
    await track(moveFieldAction(orgId, field.id, direction));
  }

  async function trashSelected(ids: string[]) {
    if (ids.length === 0) return;
    const done = await track(trashRecordsAction(orgId, database.id, ids));
    if (done === undefined) return;
    setRecords((rs) => rs.filter((r) => !ids.includes(r.id)));
    setSelected(new Set());
    toast({
      title: ids.length === 1 ? "Row moved to the trash" : `${ids.length} rows moved to the trash`,
      action: {
        label: "Undo",
        run: async () => {
          const result = await restoreRecordsAction(orgId, database.id, ids);
          router.refresh();
          return result.error;
        },
      },
    });
    router.refresh();
  }

  async function restore(ids: string[]) {
    const done = await track(restoreRecordsAction(orgId, database.id, ids));
    if (done === undefined) return;
    setRecords((rs) => rs.filter((r) => !ids.includes(r.id)));
    toast({ title: ids.length === 1 ? "Row restored" : `${ids.length} rows restored` });
    router.refresh();
  }

  async function purge(ids: string[] | "all") {
    const ok = await confirm({
      title: ids === "all" ? "Empty the trash?" : "Delete for good?",
      description: "These rows are deleted forever. This can't be undone.",
      confirmLabel: "Delete forever",
      run: async () => (await purgeRecordsAction(orgId, database.id, ids)).error,
    });
    if (!ok) return;
    setRecords((rs) => (ids === "all" ? [] : rs.filter((r) => !ids.includes(r.id))));
    router.refresh();
  }

  function exportCsv() {
    const header = fields.map((f) => f.name);
    const lines = shown.map((r) => fields.map((f) => displayText(f, r.values[f.id], memberNames)));
    const csv = [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${database.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const status =
    pending > 0 ? (
      <span
        className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
        role="status"
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Saving…
      </span>
    ) : failed ? (
      <span className="text-destructive inline-flex items-center gap-1.5 text-xs" role="status">
        <CircleAlert className="size-3.5" aria-hidden="true" />
        Last change not saved
      </span>
    ) : (
      <span
        className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
        role="status"
      >
        <Check className="size-3.5" aria-hidden="true" />
        All changes saved
      </span>
    );

  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const expandedRecord = records.find((r) => r.id === expanded) ?? null;

  return (
    <div className="space-y-4">
      {confirmEl}
      <BackLink
        href={trash ? base : `/app/${orgSlug}/databases`}
        label={trash ? database.name : "Databases"}
      />
      <PageHeader
        title={trash ? `${database.name}: trash` : database.name}
        description={
          trash
            ? "Rows deleted in the last while. Restore them, or delete them for good."
            : (database.description ?? undefined)
        }
        actions={
          <>
            {!trash && status}
            {!trash && canEdit && (
              <Button size="sm" onClick={() => void addRow()}>
                <Plus aria-hidden="true" />
                New row
              </Button>
            )}
            {trash && database.canManage && records.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => void purge("all")}>
                <Trash2 aria-hidden="true" />
                Empty trash
              </Button>
            )}
            {!trash && (
              <ItemMenu
                label={`More actions for ${database.name}`}
                items={[
                  { label: "Export CSV", icon: Download, onSelect: exportCsv },
                  {
                    label: `Trash${database.trashCount ? ` (${database.trashCount})` : ""}`,
                    icon: Trash2,
                    href: `${base}?trash=1`,
                  },
                  database.canManage && {
                    label: "Settings",
                    icon: Settings2,
                    onSelect: () => setSettingsOpen(true),
                    separated: true,
                  },
                ]}
              />
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onValueChange={setQuery}
          placeholder={`Search ${database.name}`}
          aria-label={`Search ${database.name}`}
        />
        <span className="text-muted-foreground text-xs tabular-nums">
          {shown.length === records.length
            ? `${records.length.toLocaleString()} ${records.length === 1 ? "row" : "rows"}`
            : `${shown.length.toLocaleString()} of ${records.length.toLocaleString()} rows`}
        </span>
        {!database.canEdit && !trash && (
          <span className="text-muted-foreground text-xs">
            · You can view this database; its owners and admins edit it.
          </span>
        )}
        {selected.size > 0 && canEdit && (
          <span className="ms-auto flex items-center gap-2">
            <span className="text-sm">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => void trashSelected([...selected])}>
              <Trash2 aria-hidden="true" />
              Move to trash
            </Button>
          </span>
        )}
      </div>

      <div ref={tableRef} className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-[color-mix(in_oklab,var(--muted)_45%,var(--card))]">
              {fields.map((f, i) => (
                <th
                  key={f.id}
                  scope="col"
                  style={{
                    width: WIDTH[f.type] + (f.isPrimary && canEdit ? 36 : 0),
                    minWidth: WIDTH[f.type] + (f.isPrimary && canEdit ? 36 : 0),
                  }}
                  className={cn(
                    "border-r p-0 text-left font-medium",
                    f.isPrimary &&
                      "sticky left-0 z-10 bg-[color-mix(in_oklab,var(--muted)_45%,var(--card))]",
                  )}
                >
                  {f.isPrimary && canEdit ? (
                    <div className="flex items-center">
                      <span className="grid w-9 shrink-0 place-items-center">
                        <Checkbox
                          aria-label="Select all rows"
                          checked={allShownSelected}
                          onCheckedChange={(v) =>
                            setSelected(v === true ? new Set(shown.map((r) => r.id)) : new Set())
                          }
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <FieldHeader
                          field={f}
                          index={i}
                          count={fields.length}
                          sort={sort}
                          canManage={database.canManage && !trash}
                          onSort={(dir) => setSort(dir ? { fieldId: f.id, dir } : null)}
                          onRename={() => setRenaming(f)}
                          onChoices={() => setEditingChoices(f)}
                          onType={(t) => void changeType(f, t)}
                          onMove={(d) => void move(f, d)}
                          onDelete={() => void removeField(f)}
                        />
                      </div>
                    </div>
                  ) : (
                    <FieldHeader
                      field={f}
                      index={i}
                      count={fields.length}
                      sort={sort}
                      canManage={database.canManage && !trash}
                      onSort={(dir) => setSort(dir ? { fieldId: f.id, dir } : null)}
                      onRename={() => setRenaming(f)}
                      onChoices={() => setEditingChoices(f)}
                      onType={(t) => void changeType(f, t)}
                      onMove={(d) => void move(f, d)}
                      onDelete={() => void removeField(f)}
                    />
                  )}
                </th>
              ))}
              {database.canManage && !trash && (
                <th className="w-12 p-0">
                  <NewFieldPopover
                    onAdd={async (name, type) => {
                      const field = await track(
                        addFieldAction(orgId, database.id, {
                          name,
                          type,
                          options: hasChoices(type) ? { choices: [] } : {},
                        }),
                      );
                      if (field) setFields((fs) => [...fs, field]);
                      return Boolean(field);
                    }}
                  />
                </th>
              )}
              {trash && <th className="w-48 px-3 text-left font-medium">Deleted</th>}
              <th className="w-12" aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.id}
                data-row={r.id}
                className="group/row border-b last:border-b-0 hover:bg-[color-mix(in_oklab,var(--muted)_25%,var(--card))]"
              >
                {fields.map((f) => (
                  <td
                    key={f.id}
                    data-primary={f.isPrimary || undefined}
                    className={cn(
                      "border-r p-0.5",
                      f.isPrimary &&
                        "bg-card sticky left-0 z-10 font-medium group-hover/row:bg-[color-mix(in_oklab,var(--muted)_25%,var(--card))]",
                    )}
                  >
                    {f.isPrimary && canEdit ? (
                      <div className="flex items-center">
                        <span className="grid w-8 shrink-0 place-items-center">
                          <Checkbox
                            aria-label={`Select ${displayText(f, r.values[f.id], memberNames) || "row"}`}
                            checked={selected.has(r.id)}
                            onCheckedChange={(v) =>
                              setSelected((sel) => {
                                const next = new Set(sel);
                                if (v === true) next.add(r.id);
                                else next.delete(r.id);
                                return next;
                              })
                            }
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <CellEditor
                            field={f}
                            value={r.values[f.id]}
                            members={members}
                            canEdit={canEdit}
                            canManage={database.canManage}
                            label={`${f.name} for ${displayText(primary!, r.values[primary!.id], memberNames) || "this row"}`}
                            onSave={(v) => void saveCell(r.id, f.id, v)}
                            onAddChoice={(label) => addChoice(f, label)}
                          />
                        </div>
                      </div>
                    ) : (
                      <CellEditor
                        field={f}
                        value={r.values[f.id]}
                        members={members}
                        canEdit={canEdit}
                        canManage={database.canManage}
                        label={`${f.name} for ${displayText(primary!, r.values[primary!.id], memberNames) || "this row"}`}
                        onSave={(v) => void saveCell(r.id, f.id, v)}
                        onAddChoice={(label) => addChoice(f, label)}
                      />
                    )}
                  </td>
                ))}
                {database.canManage && !trash && <td />}
                {trash && (
                  <td className="text-muted-foreground px-3 text-xs whitespace-nowrap">
                    {r.deletedAt ? new Date(r.deletedAt).toLocaleString() : ""}
                  </td>
                )}
                <td className="px-1">
                  {trash ? (
                    <ItemMenu
                      label="Row actions"
                      items={[
                        database.canEdit && {
                          label: "Restore",
                          icon: RotateCcw,
                          onSelect: () => void restore([r.id]),
                        },
                        database.canManage && {
                          label: "Delete forever",
                          icon: Trash2,
                          destructive: true,
                          separated: true,
                          onSelect: () => void purge([r.id]),
                        },
                      ]}
                    />
                  ) : (
                    <ItemMenu
                      label="Row actions"
                      items={[
                        { label: "Expand row", icon: Maximize2, onSelect: () => setExpanded(r.id) },
                        canEdit && {
                          label: "Move to trash",
                          icon: Trash2,
                          destructive: true,
                          separated: true,
                          onSelect: () => void trashSelected([r.id]),
                        },
                      ]}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 ? (
          <div className="space-y-2 p-6">
            <p className="heading text-sm">{trash ? "The trash is empty" : "No rows yet"}</p>
            <p className="text-muted-foreground text-sm">
              {trash
                ? "Rows moved to the trash show up here."
                : canEdit
                  ? "Add the first row. Everything you type is saved automatically."
                  : "Nothing has been added yet."}
            </p>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => void addRow()}>
                <Plus aria-hidden="true" />
                New row
              </Button>
            )}
          </div>
        ) : (
          shown.length === 0 && (
            <p className="text-muted-foreground p-6 text-sm">No rows match “{query}”.</p>
          )
        )}
        {canEdit && records.length > 0 && (
          <button
            type="button"
            onClick={() => void addRow()}
            className="text-muted-foreground hover:bg-muted/40 hover:text-foreground sticky left-0 flex w-full items-center gap-2 border-t px-3 py-2 text-sm"
          >
            <Plus className="size-4" aria-hidden="true" />
            New row
          </button>
        )}
      </div>
      {database.truncated && (
        <p className="text-muted-foreground text-xs">
          Showing the first 5,000 rows. Search narrows them; the owner&apos;s data export has
          everything.
        </p>
      )}

      <Sheet open={expandedRecord !== null} onOpenChange={(o) => !o && setExpanded(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {expandedRecord && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {displayText(primary!, expandedRecord.values[primary!.id], memberNames) ||
                    "Untitled row"}
                </SheetTitle>
                <SheetDescription>
                  {expandedRecord.updatedByName
                    ? `Last edited by ${expandedRecord.updatedByName}`
                    : "Every change saves as you make it."}
                </SheetDescription>
              </SheetHeader>
              <dl className="space-y-3 px-4 pb-6">
                {fields.map((f) => (
                  <div key={f.id} className="space-y-1">
                    <dt className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <FieldIcon type={f.type} />
                      {f.name}
                    </dt>
                    <dd className="rounded-md border p-0.5">
                      <CellEditor
                        field={f}
                        value={expandedRecord.values[f.id]}
                        members={members}
                        canEdit={canEdit}
                        canManage={database.canManage}
                        label={f.name}
                        onSave={(v) => void saveCell(expandedRecord.id, f.id, v)}
                        onAddChoice={(label) => addChoice(f, label)}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>

      {renaming && (
        <FieldNameDialog
          field={renaming}
          onClose={() => setRenaming(null)}
          onSave={async (name) => {
            const updated = await track(updateFieldAction(orgId, renaming.id, { name }));
            if (updated) setFields((fs) => fs.map((f) => (f.id === updated.id ? updated : f)));
            return Boolean(updated);
          }}
        />
      )}
      {editingChoices && (
        <ChoicesDialog
          field={editingChoices}
          onClose={() => setEditingChoices(null)}
          onSave={async (choices) => {
            const updated = await track(
              updateFieldAction(orgId, editingChoices.id, {
                options: { ...editingChoices.options, choices },
              }),
            );
            if (!updated) return false;
            setFields((fs) => fs.map((f) => (f.id === updated.id ? updated : f)));
            router.refresh();
            return true;
          }}
        />
      )}
      {database.canManage && (
        <DatabaseSettingsDialog
          orgId={orgId}
          orgSlug={orgSlug}
          database={database}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </div>
  );
}

function FieldHeader({
  field,
  index,
  count,
  sort,
  canManage,
  onSort,
  onRename,
  onChoices,
  onType,
  onMove,
  onDelete,
}: {
  field: FieldDef;
  index: number;
  count: number;
  sort: Sort;
  canManage: boolean;
  onSort: (dir: 1 | -1 | null) => void;
  onRename: () => void;
  onChoices: () => void;
  onType: (type: FieldType) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const sorted = sort?.fieldId === field.id ? sort.dir : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted/60 flex h-9 w-full items-center gap-1.5 px-2 text-left text-xs font-medium"
          aria-label={`${field.name} (${FIELD_TYPE_META[field.type].label}) options`}
        >
          <FieldIcon type={field.type} />
          <span className="truncate">{field.name}</span>
          {sorted &&
            (sorted === 1 ? (
              <ArrowDownAZ className="ms-auto size-3.5" aria-hidden="true" />
            ) : (
              <ArrowUpAZ className="ms-auto size-3.5" aria-hidden="true" />
            ))}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onSelect={() => onSort(sorted === 1 ? null : 1)}>
          <ArrowDownAZ aria-hidden="true" />
          {sorted === 1 ? "Clear sort" : "Sort A → Z"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSort(sorted === -1 ? null : -1)}>
          <ArrowUpAZ aria-hidden="true" />
          {sorted === -1 ? "Clear sort" : "Sort Z → A"}
        </DropdownMenuItem>
        {canManage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRename}>
              <Pencil aria-hidden="true" />
              Rename
            </DropdownMenuItem>
            {hasChoices(field.type) && (
              <DropdownMenuItem onSelect={onChoices}>
                <Shapes aria-hidden="true" />
                Edit choices
              </DropdownMenuItem>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FieldIcon type={field.type} />
                Change type
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {FIELD_TYPES.map((t) => (
                  <DropdownMenuItem
                    key={t}
                    onSelect={() => onType(t)}
                    disabled={
                      field.isPrimary && !["TEXT", "NUMBER", "EMAIL", "PHONE", "URL"].includes(t)
                    }
                  >
                    <FieldIcon type={t} />
                    {FIELD_TYPE_META[t].label}
                    {t === field.type && <Check className="ms-auto" aria-hidden="true" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {!field.isPrimary && (
              <>
                <DropdownMenuItem onSelect={() => onMove(-1)} disabled={index <= 1}>
                  <ArrowLeft aria-hidden="true" />
                  Move left
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onMove(1)} disabled={index >= count - 1}>
                  <ArrowRight aria-hidden="true" />
                  Move right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 aria-hidden="true" />
                  Delete field
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
