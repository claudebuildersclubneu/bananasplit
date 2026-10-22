"use client";

import {
  CalendarDays,
  Check,
  GanttChart,
  ListTree,
  ChevronDown,
  Columns3,
  FolderKanban,
  Gauge,
  Lock,
  Network,
  SlidersHorizontal,
  Table2,
  Tag,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterChoices, FilterSheet, PhoneToolbar } from "@/components/ui/phone-toolbar";
import { UserAvatar } from "@/components/user-avatar";
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
import { hasModifier, isTypingTarget, overlayOpen, SCOPE_KEYS, TASK_KEYS } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

import { PHONE_HIDDEN_LAYOUTS, type TaskLayout } from "@/app/app/[orgSlug]/tasks/views";

import { STATUS_LABELS } from "./status-select";
import { ProjectDot, ProjectMenu } from "./project-menu";
import { menuItemClass, useMemberSearch } from "./task-fields";
import { useTasks, useWorkspace } from "./tasks-context";

/**
 * The one toolbar (C4).
 *
 * Every layout reads the same query, so this bar is the whole navigation:
 * which layout, whose work, and which tasks. It writes to the URL, which
 * means a filtered view is a link you can paste into Slack, and going back
 * really goes back.
 *
 * Layout icons carry labels on desktop; the filters collapse behind one
 * button with a count so the bar never wraps into a wall of selects. Every
 * control is the same height (h-7).
 *
 * A phone gets its own one-row bar (MobileToolbar): whose work, the layout
 * picker, Filters (a sheet with every filter, each with its name) and
 * search, since six layout icons in a row meant nothing there.
 */

/** Whose work, as the phone's toolbar draws it. */
const SCOPE_ICONS = {
  mine: UserRound,
  team: Network,
  all: UsersRound,
} as const;

const LAYOUT_ICONS = {
  board: Columns3,
  week: CalendarDays,
  list: ListTree,
  roadmap: GanttChart,
  table: Table2,
  dashboard: Gauge,
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
      if (event.defaultPrevented || isTypingTarget(event)) return;
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
      <MobileToolbar
        onCommitSearch={commitSearch}
        clearAll={() => router.push(`/app/${org.slug}/tasks?view=${ws.query.view}`)}
      />
      <div className="flex flex-wrap items-center gap-2 max-md:hidden">
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
              title={SCOPE_KEYS[scope.value] && `${scope.label} (${SCOPE_KEYS[scope.value]})`}
            >
              {scope.label}
            </Chip>
          ))}
          {members.length > 1 && <PersonFilter />}
          <ProjectFilter />
          {labels.length > 0 && <TagFilter />}
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
              icon={
                ws.query.visibility === TaskVisibility.PRIVATE ? (
                  <Lock className="size-3" aria-hidden="true" />
                ) : undefined
              }
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
 * The toolbar below md, the phone's one list toolbar (PhoneToolbar, as on
 * Files and People): whose work as icons you flip between (Mine, My team,
 * Everyone; their names are on them for screen readers and show from sm
 * up), Filters (a FilterSheet: person, project, tag, status, visibility,
 * each under its name, with a count on the button), and a search icon that
 * opens the search box over the row.
 *
 * Between the switch and Filters, the layouts a phone has (not the Board
 * or Table: the page and the effect below see to it), as a named picker.
 *
 * The sheet's contents mount only while it is open, so its person filter
 * doesn't add a second `p` shortcut behind the desktop one.
 */
function MobileToolbar({
  onCommitSearch,
  clearAll,
}: {
  onCommitSearch: (value: string) => void;
  clearAll: () => void;
}) {
  const { members, labels, org } = useTasks();
  const ws = useWorkspace();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pinnedPerson = ws.query.ownerId ?? ws.query.assigneeId;
  const count = ws.filterCount + (ws.query.projectId ? 1 : 0);

  // A phone the page didn't recognise (a narrow desktop window, say) still
  // leaves the Board and Table. replace, and no cookie: the desktop keeps
  // its layout.
  const { view } = ws.query;
  const { hrefWith } = ws;
  useEffect(() => {
    if (!(PHONE_HIDDEN_LAYOUTS as readonly string[]).includes(view)) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    router.replace(hrefWith({ view: "list" }), { scroll: false });
  }, [view, hrefWith, router]);
  // The List first: it is a phone's main layout.
  const layouts = ws.layouts
    .filter((l) => !PHONE_HIDDEN_LAYOUTS.includes(l.value))
    .sort((a, b) => Number(b.value === "list") - Number(a.value === "list"));
  const current = layouts.find((l) => l.value === ws.query.view);

  return (
    <>
      <PhoneToolbar
        middle={
          layouts.length > 1 && (
            // The layouts a phone has, named, filling the room up to Filters.
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-full min-w-0 justify-between gap-1 rounded-full px-3"
                  aria-label={`Layout: ${current?.label ?? "List"}`}
                >
                  <span className="truncate">{current?.label ?? "List"}</span>
                  <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel>Show tasks as</DropdownMenuLabel>
                {layouts.map((l) => {
                  const Icon = LAYOUT_ICONS[l.value];
                  return (
                    <DropdownMenuItem
                      key={l.value}
                      onSelect={() => ws.setView(l.value as TaskLayout)}
                      className="min-h-12 gap-3"
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      <span className="flex flex-col">
                        <span className="font-medium">{l.label}</span>
                        <span className="text-muted-foreground text-xs">{l.hint}</span>
                      </span>
                      {l.value === ws.query.view && (
                        <Check className="ms-auto size-4" aria-hidden="true" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
        leading={
          <Segmented
            label="Whose tasks"
            value={pinnedPerson ? "" : ws.query.scope}
            onSelect={(v) => ws.setScope(v as (typeof ws.scopes)[number]["value"])}
            options={ws.scopes.map((scope) => ({
              value: scope.value,
              label: scope.label,
              icon: SCOPE_ICONS[scope.value],
              compact: true,
              title: scope.label,
            }))}
            className="[&>button]:px-2.5"
          />
        }
        filterCount={count}
        onFilters={() => setFiltersOpen(true)}
        searchLabel="Search tasks"
        searchActive={Boolean(ws.query.q)}
        search={
          <TaskSearch
            key={ws.query.q ?? ""}
            initial={ws.query.q ?? ""}
            onCommit={onCommitSearch}
            className="w-full"
            hint=""
            autoFocus
          />
        }
        onCancelSearch={() => {
          if (ws.query.q) onCommitSearch("");
        }}
      />

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filter tasks"
        description="The list shows only the tasks that match."
        canClear={count > 0}
        onClear={clearAll}
      >
        {(members.length > 1 || labels.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {members.length > 1 && <PersonFilter />}
            <ProjectFilter />
            {labels.length > 0 && <TagFilter />}
          </div>
        )}
        {/* The header's Projects button, which a phone's header has no room for. */}
        <Link
          href={`/app/${org.slug}/tasks/projects`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          <FolderKanban className="size-4" aria-hidden="true" />
          See all projects
        </Link>
        <FilterChoices
          title="Status"
          value={ws.query.status ?? ""}
          onPick={(v) =>
            ws.setFilters({ status: (v || undefined) as TaskStatus | "open" | undefined })
          }
          options={[
            { value: "", label: "Any" },
            { value: "open", label: "Open" },
            ...Object.values(TaskStatus).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
          ]}
        />
        <FilterChoices
          title="Visibility"
          value={ws.query.visibility ?? ""}
          onPick={(v) => ws.setFilters({ visibility: (v || undefined) as TaskVisibility })}
          options={[
            { value: "", label: "Everything I can see" },
            { value: TaskVisibility.PRIVATE, label: "Private only" },
            { value: TaskVisibility.ORG, label: "Open to the club" },
          ]}
        />
      </FilterSheet>
    </>
  );
}

/**
 * Filter by project, as a pill of its own so it is there even before the
 * club has a project: its menu can make the first one, and links to the
 * projects list.
 */
function ProjectFilter() {
  const { projectById } = useTasks();
  const ws = useWorkspace();
  const [open, setOpen] = useState(false);
  const project = ws.query.projectId ? projectById.get(ws.query.projectId) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={project ? `Filtered to project ${project.name}` : "Filter by project"}
          className={chipClass(Boolean(project))}
        >
          {project ? (
            <ProjectDot project={project} />
          ) : (
            <FolderKanban className="size-3.5" aria-hidden="true" />
          )}
          <span className="max-w-36 truncate">{project?.name ?? "Project"}</span>
          <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-px p-1.5">
        <ProjectMenu
          value={ws.query.projectId ?? null}
          noneLabel="All projects"
          onPick={(id) => {
            ws.setFilters({ projectId: id ?? undefined });
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Filter by tag (one at a time, ?label=). */
function TagFilter() {
  const { labels } = useTasks();
  const ws = useWorkspace();
  const [open, setOpen] = useState(false);
  const tag = ws.query.labelId ? labels.find((l) => l.id === ws.query.labelId) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={tag ? `Filtered to tag ${tag.name}` : "Filter by tag"}
          className={chipClass(Boolean(tag))}
        >
          {tag ? (
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: tag.color }}
            />
          ) : (
            <Tag className="size-3.5" aria-hidden="true" />
          )}
          <span className="max-w-36 truncate">{tag?.name ?? "Tag"}</span>
          <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-px p-1.5">
        <div
          role="listbox"
          aria-label="Tag"
          className="flex max-h-72 flex-col gap-px overflow-y-auto"
        >
          <button
            type="button"
            role="option"
            aria-selected={!tag}
            className={menuItemClass(!tag)}
            onClick={() => (ws.setFilters({ labelId: undefined }), setOpen(false))}
          >
            Any tag
            {!tag && <Check className="ms-auto size-3.5" aria-hidden="true" />}
          </button>
          {labels.map((l) => (
            <button
              key={l.id}
              type="button"
              role="option"
              aria-selected={l.id === tag?.id}
              className={menuItemClass(l.id === tag?.id)}
              onClick={() => (ws.setFilters({ labelId: l.id }), setOpen(false))}
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: l.color }}
              />
              <span className="truncate">{l.name}</span>
              {l.id === tag?.id && <Check className="ms-auto size-3.5" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Filter by person: every layout narrowed to one member's tasks, the ones
 * they own or are involved in (or, ticked, only the ones they own). It
 * writes ?assignee= or ?owner=, the links the People pages already publish,
 * so a filtered board is a link you can share. `p` opens it; type a name and
 * press Enter.
 */
function PersonFilter() {
  const { members, memberById } = useTasks();
  const ws = useWorkspace();
  const [open, setOpen] = useState(false);
  const personId = ws.query.ownerId ?? ws.query.assigneeId;
  const person = personId ? memberById.get(personId) : undefined;
  const [ownedOnly, setOwnedOnly] = useState(Boolean(ws.query.ownerId));

  const choose = (userId: string | undefined, owned = ownedOnly) =>
    ws.setFilters(
      owned
        ? { ownerId: userId, assigneeId: undefined }
        : { assigneeId: userId, ownerId: undefined },
    );
  const search = useMemberSearch(members, {
    always: true,
    onPick: (m) => {
      choose(m.id);
      setOpen(false);
    },
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || isTypingTarget(event) || hasModifier(event)) return;
      if (event.key.toLowerCase() !== TASK_KEYS.person || overlayOpen()) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), o || search.reset())}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`Filter by person (${TASK_KEYS.person})`}
          aria-label={person ? `Filtered to ${person.name ?? "a member"}` : "Filter by person"}
          className={cn(chipClass(Boolean(person)), person && "ps-1")}
        >
          {person ? (
            <>
              <UserAvatar user={person} size="xs" />
              <span className="max-w-32 truncate">{person.name ?? "Member"}</span>
            </>
          ) : (
            <>
              <UserRound className="size-3.5" aria-hidden="true" />
              Person
            </>
          )}
          <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 gap-px p-1.5"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          search.focus();
        }}
      >
        {search.input}
        <div
          id={search.listId}
          role="listbox"
          aria-label="Person"
          className="flex max-h-72 flex-col gap-px overflow-y-auto"
        >
          {person && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              className={cn(menuItemClass(), "text-muted-foreground")}
              onClick={() => {
                choose(undefined);
                setOpen(false);
              }}
            >
              <X className="size-3.5" aria-hidden="true" />
              Anyone
            </button>
          )}
          {search.filtered.length === 0 && (
            <p className="text-muted-foreground px-2 py-2 text-[13px]">Nobody by that name.</p>
          )}
          {search.filtered.map((m, i) => (
            <button
              key={m.id}
              id={search.optionId(m)}
              type="button"
              role="option"
              aria-selected={m.id === personId}
              className={cn(menuItemClass(m.id === personId), search.isActive(i) && "bg-muted")}
              onPointerMove={() => search.hover(i)}
              onClick={() => search.pick(m)}
            >
              <UserAvatar user={m} size="xs" />
              <span className="truncate">{m.name ?? "Member"}</span>
              {m.id === personId && (
                <Check className="text-primary ms-auto size-3.5 shrink-0" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        <label className="text-muted-foreground mt-1 flex items-center gap-2 border-t px-2 pt-2 pb-1 text-xs">
          <Checkbox
            checked={ownedOnly}
            onCheckedChange={(checked) => {
              const next = checked === true;
              setOwnedOnly(next);
              if (person) choose(person.id, next);
            }}
          />
          Only tasks they own
        </label>
      </PopoverContent>
    </Popover>
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
  className = "sm:max-w-56",
  hint = "/",
  autoFocus,
}: {
  initial: string;
  onCommit: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
  /** The keyboard hint (none on a phone). */
  hint?: string;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <SearchField
      ref={inputRef}
      value={draft}
      onValueChange={setDraft}
      onClear={() => onCommit("")}
      hint={hint}
      autoFocus={autoFocus}
      placeholder="Search tasks"
      aria-label="Search tasks by title"
      className={className}
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
    <span className="bg-muted text-foreground inline-flex h-8 items-center gap-1.5 rounded-full ps-3.5 pe-1 text-[13px] font-medium">
      {icon}
      {label}
      <button
        type="button"
        aria-label={`Remove filter ${label}`}
        onClick={onClear}
        className="text-muted-foreground hover:text-foreground hover:bg-background grid size-6 place-items-center rounded-full transition-colors"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
