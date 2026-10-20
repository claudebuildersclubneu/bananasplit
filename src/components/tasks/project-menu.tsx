"use client";

import { Check, Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { createProject } from "@/app/app/[orgSlug]/tasks/projects-actions";
import { projectColor } from "@/lib/tasks/project-color";
import { cn } from "@/lib/utils";

import { menuItemClass } from "./task-fields";
import { useTasks } from "./tasks-context";
import type { ProjectOption } from "./types";

/**
 * The project picker's menu (the form's Project field, the sentence's
 * "for … project", the toolbar filter): type to narrow, pick one, or make
 * one on the spot ("Create project “Spring Gala”") when the club lets you.
 * Archived projects never appear; "Manage projects" opens the list.
 */
export function ProjectMenu({
  value,
  onPick,
  noneLabel = "No project",
  showNone = true,
  autoFocus = true,
}: {
  value: string | null;
  onPick: (id: string | null) => void;
  noneLabel?: string;
  showNone?: boolean;
  autoFocus?: boolean;
}) {
  const { org, projects, can, addProject, announce } = useTasks();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const typed = query.trim();
  const needle = typed.toLowerCase();
  const shown = needle ? projects.filter((p) => p.name.toLowerCase().includes(needle)) : projects;
  const exact = projects.find((p) => p.name.toLowerCase() === needle);
  const offerCreate = Boolean(typed) && !exact && can.createProjects;

  function create() {
    if (!offerCreate || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await createProject(org.id, { name: typed });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      addProject(result.project);
      announce(`Created project “${result.project.name}”`);
      onPick(result.project.id);
    });
  }

  return (
    <div className="flex flex-col gap-px">
      <div className="bg-muted/60 mb-1 flex h-9 items-center gap-2 rounded-full px-3">
        <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (exact) onPick(exact.id);
            else if (offerCreate) create();
            else if (shown.length === 1) onPick(shown[0]!.id);
          }}
          placeholder={can.createProjects ? "Find or create a project" : "Find a project"}
          aria-label="Find a project"
          maxLength={100}
          className="placeholder:text-muted-foreground/80 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        />
      </div>
      <div
        role="listbox"
        aria-label="Project"
        className="flex max-h-64 flex-col gap-px overflow-y-auto"
      >
        {showNone && !needle && (
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={menuItemClass(!value)}
            onClick={() => onPick(null)}
          >
            <ProjectDot project={null} />
            {noneLabel}
            {!value && <Check className="ms-auto size-3.5" aria-hidden="true" />}
          </button>
        )}
        {shown.map((p: ProjectOption) => (
          <button
            key={p.id}
            type="button"
            role="option"
            aria-selected={p.id === value}
            className={menuItemClass(p.id === value)}
            onClick={() => onPick(p.id)}
          >
            <ProjectDot project={p} />
            <span className="truncate">{p.name}</span>
            {p.id === value && <Check className="ms-auto size-3.5" aria-hidden="true" />}
          </button>
        ))}
        {projects.length === 0 && !typed && (
          <p className="text-muted-foreground px-2 py-1.5 text-[13px]">
            {can.createProjects ? "No projects yet. Type a name to make one." : "No projects yet."}
          </p>
        )}
        {typed && shown.length === 0 && !offerCreate && (
          <p className="text-muted-foreground px-2 py-1.5 text-[13px]">No project by that name.</p>
        )}
        {offerCreate && (
          <button
            type="button"
            className={cn(menuItemClass(), "bg-muted font-semibold")}
            onClick={create}
            disabled={isPending}
          >
            <Plus className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {isPending ? "Creating…" : `Create project “${typed}”`}
            </span>
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-destructive px-2 py-1 text-xs">
          {error}
        </p>
      )}
      <div className="bg-border mx-2 my-1 h-px" />
      <Link href={`/app/${org.slug}/tasks/projects`} className={menuItemClass()}>
        <SlidersHorizontal className="text-muted-foreground size-4" aria-hidden="true" />
        Manage projects
      </Link>
    </div>
  );
}

/** The 8px dot with a soft halo (StatusDot's mark), in the project's colour. */
export function ProjectDot({
  project,
}: {
  project: { id: string; color?: string | null } | null | undefined;
}) {
  const color = projectColor(project);
  return (
    <span
      aria-hidden="true"
      className="size-2 shrink-0 rounded-full"
      style={{
        background: color,
        boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 24%, transparent)`,
      }}
    />
  );
}
