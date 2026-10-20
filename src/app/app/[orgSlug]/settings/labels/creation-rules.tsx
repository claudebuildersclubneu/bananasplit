"use client";

import { useState, useTransition } from "react";

import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";

import { setCreationRules } from "./actions";

/**
 * "Who can create tags" and "Who can create projects": everyone (the
 * default) or owners and admins. The database's INSERT policies read the
 * same two switches.
 */
export function CreationRules({
  orgId,
  memberCanCreateTags,
  memberCanCreateProjects,
}: {
  orgId: string;
  memberCanCreateTags: boolean;
  memberCanCreateProjects: boolean;
}) {
  const [tags, setTags] = useState(memberCanCreateTags);
  const [projects, setProjects] = useState(memberCanCreateProjects);
  const [isPending, startTransition] = useTransition();

  function save(key: "memberCanCreateTags" | "memberCanCreateProjects", value: boolean) {
    const set = key === "memberCanCreateTags" ? setTags : setProjects;
    set(value);
    startTransition(async () => {
      const result = await setCreationRules(orgId, { [key]: value });
      if (result.error) {
        set(!value);
        toast({ title: result.error, tone: "error" });
      }
    });
  }

  return (
    <section className="bg-card edge rounded-card space-y-1 p-6 max-sm:p-[18px]">
      <h2 className="heading mb-3">Who can create</h2>
      <Rule
        id="rule-tags"
        title="Members can create tags"
        hint={
          tags
            ? "Anyone can type a new tag on a task. Only owners and admins rename, merge or delete them."
            : "Members pick from the tags you make here."
        }
        checked={tags}
        disabled={isPending}
        onChange={(v) => save("memberCanCreateTags", v)}
      />
      <div className="bg-border h-px" />
      <Rule
        id="rule-projects"
        title="Members can create projects"
        hint={
          projects
            ? "Anyone can start or edit a project. Archiving stays with owners, admins and the project's lead."
            : "Only owners and admins make and edit projects (a lead can still edit their own)."
        }
        checked={projects}
        disabled={isPending}
        onChange={(v) => save("memberCanCreateProjects", v)}
      />
    </section>
  );
}

function Rule({
  id,
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  title: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-[15px] font-medium">
          {title}
        </label>
        <p className="text-muted-foreground mt-0.5 text-[13px]">{hint}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
