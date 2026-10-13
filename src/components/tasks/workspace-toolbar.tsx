"use client";

import {
  Check,
  ChevronDown,
  Columns3,
  ListChecks,
  Lock,
  SlidersHorizontal,
  Table2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchField } from "@/components/ui/search-field";
import { chipClass, Segmented } from "@/components/ui/segmented";
import { TaskStatus, TaskVisibility } from "@/generated/prisma/enums";

import { STATUS_LABELS } from "./status-select";
import { useTasks, useWorkspace } from "./tasks-context";

/**
 * The one toolbar (C4).
 *
 * Every layout reads the same query, so this bar is the whole navigation:
 * which layout, whose work, and which tasks. It writes to the URL, which
 * means a filtered view is a link you can paste into Slack, and going back
 * really goes back.
 *
 * Layout icons carry labels on desktop and shrink to icons on a phone; the
 * filters collapse behind one button with a count so the bar never wraps
 * into a wall of selects. Every control is the same height (h-7).
 */

const LAYOUT_ICONS = {
  board: Columns3,
  week: ListChecks,
  table: Table2,
} as const;

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={chipClass(Boolean(active))}
    >
      {children}
    </button>
  );
}

export function WorkspaceToolbar() {
  const { org, labels, projects, members } = useTasks();
  const ws = useWorkspace();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  // `/` focuses search from anywhere that is not already a field.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commitSearch = useCallback(
    (value: string) => startTransition(() => ws.setFilters({ q: value || undefined })),
    [ws],
  );

  const activeProject = ws.query.projectId
    ? projects.find((p) => p.id === ws.query.projectId)
    : null;
  const activeLabel = ws.query.labelId ? labels.find((l) => l.id === ws.query.labelId) : null;
  const pinnedPerson = ws.query.ownerId ?? ws.query.assigneeId;
  const pinnedMember = pinnedPerson ? members.find((m) => m.id === pinnedPerson) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Layout: three shapes of the same question (none on the Free plan). */}
        {ws.layouts.length > 0 && (
          <Segmented
            label="Layout"
            value={ws.query.view}
            onSelect={(v) => ws.setView(v as (typeof ws.layouts)[number]["value"])}
            options={ws.layouts.map((layout, index) => ({
              value: layout.value,
              label: layout.label,
              icon: LAYOUT_ICONS[layout.value],
              compact: true,
              title: `${layout.label}: ${layout.hint} (${index + 1})`,
            }))}
          />
        )}

        {/* Scope: whose work. The team option only exists if you have reports. */}
        <div className="flex items-center gap-1" role="group" aria-label="Whose tasks">
          {ws.scopes.map((scope) => (
            <Chip
              key={scope.value}
              active={ws.query.scope === scope.value && !pinnedMember}
              onClick={() => ws.setScope(scope.value)}
            >
              {scope.label}
            </Chip>
          ))}
        </div>

        <div className="ms-auto flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <TaskSearch
            key={ws.query.q ?? ""}
            inputRef={searchRef}
            initial={ws.query.q ?? ""}
            onCommit={commitSearch}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Filter</span>
                {ws.filterCount > 0 && (
                  <Badge className="h-4 min-w-4 px-1 text-[10px]">{ws.filterCount}</Badge>
                )}
                <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => ws.setFilters({ status: undefined })}>
                Any status
                {!ws.query.status && <Check className="ms-auto size-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => ws.setFilters({ status: "open" })}>
                Open (not completed)
                {ws.query.status === "open" && <Check className="ms-auto size-4" />}
              </DropdownMenuItem>
              {Object.values(TaskStatus).map((s) => (
                <DropdownMenuItem key={s} onSelect={() => ws.setFilters({ status: s })}>
                  {STATUS_LABELS[s]}
                  {ws.query.status === s && <Check className="ms-auto size-4" />}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Visibility</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => ws.setFilters({ visibility: undefined })}>
                Everything I can see
                {!ws.query.visibility && <Check className="ms-auto size-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => ws.setFilters({ visibility: TaskVisibility.PRIVATE })}
              >
                <Lock className="size-4" aria-hidden="true" /> Private only
                {ws.query.visibility === TaskVisibility.PRIVATE && (
                  <Check className="ms-auto size-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => ws.setFilters({ visibility: TaskVisibility.ORG })}>
                Open to the club
                {ws.query.visibility === TaskVisibility.ORG && <Check className="ms-auto size-4" />}
              </DropdownMenuItem>

              {labels.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Label</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => ws.setFilters({ labelId: undefined })}>
                    Any label
                    {!ws.query.labelId && <Check className="ms-auto size-4" />}
                  </DropdownMenuItem>
                  {labels.map((l) => (
                    <DropdownMenuItem key={l.id} onSelect={() => ws.setFilters({ labelId: l.id })}>
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      {l.name}
                      {ws.query.labelId === l.id && <Check className="ms-auto size-4" />}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {projects.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Project</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => ws.setFilters({ projectId: undefined })}>
                    All projects
                    {!ws.query.projectId && <Check className="ms-auto size-4" />}
                  </DropdownMenuItem>
                  {projects.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onSelect={() => ws.setFilters({ projectId: p.id })}
                    >
                      {p.name}
                      {ws.query.projectId === p.id && <Check className="ms-auto size-4" />}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* What is currently narrowing the view, each removable on its own. */}
      {(ws.filterCount > 0 || activeProject) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeProject && (
            <FilterPill
              label={activeProject.name}
              onClear={() => ws.setFilters({ projectId: undefined })}
            />
          )}
          {ws.query.status && (
            <FilterPill
              label={
                ws.query.status === "open"
                  ? "Open"
                  : (STATUS_LABELS[ws.query.status] ?? ws.query.status)
              }
              onClear={() => ws.setFilters({ status: undefined })}
            />
          )}
          {ws.query.visibility && (
            <FilterPill
              icon={<Lock className="size-3" aria-hidden="true" />}
              label={
                ws.query.visibility === TaskVisibility.PRIVATE ? "Private only" : "Open to the club"
              }
              onClear={() => ws.setFilters({ visibility: undefined })}
            />
          )}
          {activeLabel && (
            <FilterPill
              icon={
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: activeLabel.color }}
                />
              }
              label={activeLabel.name}
              onClear={() => ws.setFilters({ labelId: undefined })}
            />
          )}
          {pinnedMember && (
            <FilterPill
              label={`${ws.query.ownerId ? "Owned by" : "Involving"} ${pinnedMember.name ?? "someone"}`}
              onClear={() => ws.setFilters({ ownerId: undefined, assigneeId: undefined })}
            />
          )}
          {ws.query.blockers && (
            <FilterPill label="Blockers" onClear={() => ws.setFilters({ blockers: false })} />
          )}
          {ws.query.flagged && (
            <FilterPill label="Flagged" onClear={() => ws.setFilters({ flagged: false })} />
          )}
          {ws.query.q && (
            <FilterPill label={`“${ws.query.q}”`} onClear={() => ws.setFilters({ q: undefined })} />
          )}
          {(ws.query.dueFrom || ws.query.dueTo) && (
            <FilterPill
              label={`Due ${ws.query.dueFrom ?? "…"} – ${ws.query.dueTo ?? "…"}`}
              onClear={() => ws.setFilters({ dueFrom: undefined, dueTo: undefined })}
            />
          )}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground ms-1 text-xs underline-offset-4 hover:underline"
            onClick={() => {
              router.push(`/app/${org.slug}/tasks?view=${ws.query.view}`);
            }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Search is uncontrolled between commits: you type freely, and Enter (or
 * leaving the field) writes it to the URL. Remounting on the committed value
 * keeps the two in step without an effect that fights your typing.
 */
function TaskSearch({
  initial,
  onCommit,
  inputRef,
}: {
  initial: string;
  onCommit: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <SearchField
      ref={inputRef}
      value={draft}
      onValueChange={setDraft}
      onClear={() => onCommit("")}
      hint="/"
      placeholder="Search tasks"
      aria-label="Search tasks by title"
      className="sm:max-w-56"
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit(draft.trim());
        if (e.key === "Escape") {
          setDraft("");
          onCommit("");
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        if (draft.trim() !== initial) onCommit(draft.trim());
      }}
    />
  );
}

function FilterPill({
  label,
  icon,
  onClear,
}: {
  label: string;
  icon?: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <span className="bg-muted text-foreground inline-flex h-7 items-center gap-1.5 rounded-md ps-2.5 pe-1 text-xs font-medium">
      {icon}
      {label}
      <button
        type="button"
        aria-label={`Remove filter ${label}`}
        onClick={onClear}
        className="text-muted-foreground hover:text-foreground hover:bg-background rounded-md p-0.5 transition-colors"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
