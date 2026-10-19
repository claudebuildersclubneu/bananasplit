"use client";

import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { EmptyState } from "@/components/empty-state";
import { ItemMenu } from "@/components/item-menu";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/chip";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { UserAvatar } from "@/components/user-avatar";
import { formatDueKey } from "@/lib/tasks/dates";
import { projectColor } from "@/lib/tasks/project-color";
import {
  canArchiveProject,
  canCreateProject,
  canDeleteProject,
  canEditProject,
  PROJECT_STATUSES,
  projectStatusLabel,
  type ProjectActor,
  type ProjectStatusValue,
} from "@/lib/tasks/projects";
import { cn } from "@/lib/utils";
import type { OrgMemberOption } from "@/server/members";

import {
  archiveProject,
  createProject,
  deleteProject,
  unarchiveProject,
  updateProject,
} from "../projects-actions";

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  leadId: string | null;
  lead: { id: string; name: string | null; image: string | null; avatar: unknown } | null;
  status: string;
  startDate: string | null;
  targetDate: string | null;
  archivedAt: string | null;
  open: number;
  done: number;
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "var(--success)",
  ON_HOLD: "var(--warning)",
  DONE: "var(--muted-foreground)",
};

function datesText(start: string | null, target: string | null): string | null {
  if (start && target) return `${formatDueKey(start)} – ${formatDueKey(target)}`;
  if (target) return `Due ${formatDueKey(target)}`;
  if (start) return `From ${formatDueKey(start)}`;
  return null;
}

export function ProjectsView({
  org,
  viewer,
  members,
  colors,
  projects,
}: {
  org: { id: string; slug: string };
  viewer: ProjectActor;
  members: OrgMemberOption[];
  /** Colours a project can take: the club's chart slots, then a few brights. */
  colors: string[];
  projects: ProjectRow[];
}) {
  const [editing, setEditing] = useState<ProjectRow | "new" | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const live = projects.filter((p) => !p.archivedAt);
  const archived = projects.filter((p) => p.archivedAt);
  const canCreate = canCreateProject(viewer);
  const counts = PROJECT_STATUSES.map((s) => ({
    ...s,
    n: live.filter((p) => p.status === s.value).length,
  })).filter((s) => s.n > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={
          live.length === 0
            ? "Group the club's work so everyone can see how each piece is going."
            : counts.map((s) => `${s.n} ${s.label.toLowerCase()}`).join(" · ")
        }
        actions={
          canCreate && (
            <Button variant="create" onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden="true" />
              New project
            </Button>
          )
        }
      />

      {live.length === 0 ? (
        <div className="bg-card edge rounded-card">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description={
              canCreate
                ? "A project groups tasks toward one goal, like the Fall Showcase."
                : "Ask an owner or admin to set one up."
            }
            action={
              canCreate && (
                <Button variant="create" onClick={() => setEditing("new")}>
                  New project
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className="bg-card edge rounded-card p-2" aria-label="Projects">
          {live.map((p) => (
            <ProjectListRow
              key={p.id}
              org={org}
              project={p}
              viewer={viewer}
              onEdit={() => setEditing(p)}
            />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-full py-1 text-sm font-medium"
          >
            <ChevronRight
              className={cn("size-4 transition-transform", showArchived && "rotate-90")}
              aria-hidden="true"
            />
            Archived
            <Badge variant="secondary">{archived.length}</Badge>
          </button>
          {showArchived && (
            <ul className="bg-card edge rounded-card p-2" aria-label="Archived projects">
              {archived.map((p) => (
                <ProjectListRow
                  key={p.id}
                  org={org}
                  project={p}
                  viewer={viewer}
                  onEdit={() => setEditing(p)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {editing && (
        <ProjectDialog
          orgId={org.id}
          project={editing === "new" ? null : editing}
          members={members}
          colors={colors}
          viewer={viewer}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ProjectListRow({
  org,
  project: p,
  viewer,
  onEdit,
}: {
  org: { id: string; slug: string };
  project: ProjectRow;
  viewer: ProjectActor;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [confirmEl, confirm] = useConfirm();
  const total = p.open + p.done;
  const pct = total > 0 ? Math.round((p.done / total) * 100) : 0;
  const color = projectColor(p);
  const dates = datesText(p.startDate, p.targetDate);
  const archived = Boolean(p.archivedAt);

  async function setArchived(next: boolean) {
    const result = next
      ? await archiveProject(org.id, p.id)
      : await unarchiveProject(org.id, p.id);
    if (result.error) {
      toast({ title: result.error, tone: "error" });
      return;
    }
    router.refresh();
    toast({
      title: next ? `Archived: ${p.name}` : `Back in the pickers: ${p.name}`,
      tone: "success",
      ...(next
        ? {
            action: {
              label: "Undo",
              run: async () => {
                const undo = await unarchiveProject(org.id, p.id);
                router.refresh();
                return undo.error;
              },
            },
          }
        : {}),
    });
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete the project “${p.name}”?`,
      description: "Its tasks stay, with no project. This can't be undone.",
      confirmLabel: "Delete project",
      run: async () => (await deleteProject(org.id, p.id)).error,
    });
    if (ok) router.refresh();
  }

  return (
    <li className="group hover:bg-muted/60 relative flex flex-wrap items-center gap-x-4 gap-y-2 rounded-tile px-3 py-3 transition-colors sm:flex-nowrap [&+&]:before:bg-border [&+&]:before:absolute [&+&]:before:inset-x-3 [&+&]:before:top-0 [&+&]:before:h-px">
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 24%, transparent)` }}
      />
      <div className="min-w-0 flex-1 basis-48">
        <Link
          href={`/app/${org.slug}/tasks?view=board&project=${p.id}`}
          className="hover:underline-offset-4 block truncate text-[15px] font-semibold hover:underline"
        >
          {p.name}
        </Link>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <StatusDot color={STATUS_DOT[p.status] ?? "var(--muted-foreground)"}>
            {archived ? "Archived" : projectStatusLabel(p.status)}
          </StatusDot>
          {dates && <span>{dates}</span>}
        </div>
      </div>

      <div className="flex min-w-36 items-center gap-2" title={p.lead?.name ?? "No lead"}>
        {p.lead ? (
          <>
            <UserAvatar user={p.lead} size="sm" />
            <span className="truncate text-[13px]">{p.lead.name ?? "Member"}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-[13px]">No lead</span>
        )}
      </div>

      <div className="flex w-40 items-center gap-2 text-xs font-semibold tabular-nums">
        <span
          className="bg-muted h-[5px] flex-1 overflow-hidden rounded-full"
          role="img"
          aria-label={`${p.done} of ${total} done`}
        >
          <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </span>
        <span className="text-muted-foreground w-12 text-right">
          {p.done}/{total}
        </span>
      </div>

      <ItemMenu
        label={`Actions for ${p.name}`}
        items={[
          canEditProject(viewer, p) && { label: "Edit", icon: Pencil, onSelect: onEdit },
          canArchiveProject(viewer, p) &&
            (archived
              ? {
                  label: "Unarchive",
                  icon: ArchiveRestore,
                  onSelect: () => void setArchived(false),
                }
              : { label: "Archive", icon: Archive, onSelect: () => void setArchived(true) }),
          canDeleteProject(viewer) && {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onSelect: () => void remove(),
          },
        ]}
      />
      {confirmEl}
    </li>
  );
}

function ProjectDialog({
  orgId,
  project,
  members,
  colors,
  viewer,
  onClose,
}: {
  orgId: string;
  project: ProjectRow | null;
  members: OrgMemberOption[];
  colors: string[];
  viewer: ProjectActor;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState<string | null>(project?.color ?? null);
  const [leadId, setLeadId] = useState<string | null>(project?.leadId ?? viewer.userId);
  const [status, setStatus] = useState<ProjectStatusValue>(
    (project?.status as ProjectStatusValue) ?? "ACTIVE",
  );
  const [startDate, setStartDate] = useState(project?.startDate ?? "");
  const [targetDate, setTargetDate] = useState(project?.targetDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const input = {
        name,
        ...(color ? { color } : {}),
        leadId,
        status,
        startDate: startDate || null,
        targetDate: targetDate || null,
      };
      const result = project
        ? await updateProject(orgId, project.id, input)
        : await createProject(orgId, input);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      toast({
        title: project ? `Saved: ${result.project.name}` : `Created: ${result.project.name}`,
        tone: "success",
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={save} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
            <DialogDescription>
              Tasks filed under it show its colour, and its progress counts them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="project-name" className="text-[13px] font-semibold">
              Name
            </label>
            <Input
              id="project-name"
              value={name}
              autoFocus
              required
              maxLength={100}
              placeholder="Fall Showcase"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[13px] font-semibold">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "focus-glow size-7 rounded-full transition-transform active:scale-[0.94]",
                    color === c && "ring-foreground ring-offset-card ring-2 ring-offset-2",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
            {!color && (
              <p className="text-muted-foreground text-xs">
                Leave it and the project takes the theme&apos;s next colour.
              </p>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="project-lead" className="text-[13px] font-semibold">
                Lead
              </label>
              <Select
                value={leadId ?? "none"}
                onValueChange={(v) => setLeadId(v === "none" ? null : v)}
              >
                <SelectTrigger id="project-lead" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nobody</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name ?? "Member"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="block text-[13px] font-semibold">Status</span>
              <Segmented
                label="Project status"
                value={status}
                onSelect={(v) => setStatus(v as ProjectStatusValue)}
                options={PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="project-start" className="text-[13px] font-semibold">
                Start
              </label>
              <Input
                id="project-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="project-target" className="text-[13px] font-semibold">
                Target date
              </label>
              <Input
                id="project-target"
                type="date"
                value={targetDate}
                min={startDate || undefined}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Saving…" : project ? "Save" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
