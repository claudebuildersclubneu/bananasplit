"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/user-avatar";
import { TaskPriority, TaskStatus, TaskVisibility } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

import { DueMenu, longDue, menuItemClass, PRIORITY_LABEL, projectColor } from "./task-fields";
import { STATUS_LABEL } from "./layout-ui";
import { useTasks } from "./tasks-context";

/**
 * Sentence mode: the task said as one sentence, each choice an underlined
 * word that opens its options. Quicker than the form for the usual case;
 * everything carries over when you switch back to Form for the rest.
 */
export function TaskSentence({
  title,
  onTitle,
  ownerId,
  onOwner,
  ownerLocked,
  dueDate,
  onDue,
  projectId,
  onProject,
  priority,
  onPriority,
  priorityLocked,
  status,
  onStatus,
  visibility,
  onVisibility,
  visibilityLocked,
  onMore,
  onSubmit,
}: {
  title: string;
  onTitle: (v: string) => void;
  ownerId: string | null;
  onOwner: (v: string | null) => void;
  ownerLocked?: boolean;
  dueDate: string;
  onDue: (v: string) => void;
  projectId: string | null;
  onProject: (v: string | null) => void;
  priority: TaskPriority;
  onPriority: (v: TaskPriority) => void;
  priorityLocked?: boolean;
  status: TaskStatus;
  onStatus: (v: TaskStatus) => void;
  visibility: TaskVisibility;
  onVisibility: (v: TaskVisibility) => void;
  visibilityLocked?: boolean;
  /** Switch to Form, to add what the sentence doesn't say. */
  onMore: () => void;
  onSubmit: () => void;
}) {
  const { members, memberById, projects, projectById, viewer } = useTasks();
  const owner = ownerId ? memberById.get(ownerId) : undefined;
  const ownerText = owner
    ? ownerId === viewer.userId
      ? "You"
      : (owner.name?.split(/\s+/)[0] ?? "Someone")
    : "Nobody";
  const project = projectId ? projectById.get(projectId) : undefined;

  return (
    <div className="flex flex-col gap-[18px] pt-4">
      <div>
        <label htmlFor="task-sentence-title" className="text-muted-foreground mb-1.5 block text-xs">
          What needs to get done?
        </label>
        <input
          id="task-sentence-title"
          autoFocus
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          onKeyDown={(e) => {
            // Enter creates; ⌘↵ is left to the panel, which creates too.
            if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              if (title.trim()) onSubmit();
            }
          }}
          placeholder="Book a room for demo night"
          className="border-primary text-foreground placeholder:text-muted-foreground/70 w-full border-0 border-b-2 bg-transparent px-0.5 pt-0.5 pb-1 text-[21px] font-semibold outline-none placeholder:font-normal"
        />
      </div>

      <p className="text-foreground/80 m-0 text-[21px] leading-[1.85]">
        <Slot label="Owner" text={ownerText} empty={!owner} disabled={ownerLocked}>
          {(close) => (
            <div className="flex max-h-72 flex-col gap-px overflow-y-auto">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={menuItemClass(m.id === ownerId)}
                  onClick={() => (onOwner(m.id), close())}
                >
                  <UserAvatar user={m} size="xs" />
                  <span className="truncate">{m.name ?? "Member"}</span>
                </button>
              ))}
              <button
                type="button"
                className={cn(menuItemClass(ownerId === null), "text-muted-foreground")}
                onClick={() => (onOwner(null), close())}
              >
                Nobody yet
              </button>
            </div>
          )}
        </Slot>{" "}
        {ownerText === "You" ? "own" : "owns"} it, due{" "}
        <Slot label="Due date" text={dueDate ? longDue(dueDate) : "whenever"} empty={!dueDate}>
          {(close) => <DueMenu value={dueDate} onPick={(k) => (onDue(k), close())} />}
        </Slot>
        , for{" "}
        <Slot label="Project" text={project?.name ?? "any project"} empty={!project}>
          {(close) => (
            <div className="flex max-h-72 flex-col gap-px overflow-y-auto">
              <button
                type="button"
                className={menuItemClass(!projectId)}
                onClick={() => (onProject(null), close())}
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-[2px]"
                  style={{ background: projectColor(null) }}
                />
                No project
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={menuItemClass(p.id === projectId)}
                  onClick={() => (onProject(p.id), close())}
                >
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-[2px]"
                    style={{ background: projectColor(p.id) }}
                  />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </Slot>
        . It&apos;s{" "}
        <Slot
          label="Priority"
          text={PRIORITY_LABEL[priority].toLowerCase()}
          disabled={priorityLocked}
        >
          {(close) => (
            <div className="flex flex-col gap-px">
              {(Object.values(TaskPriority) as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={menuItemClass(p === priority)}
                  onClick={() => (onPriority(p), close())}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          )}
        </Slot>{" "}
        priority,{" "}
        <Slot label="Status" text={(STATUS_LABEL[status] ?? status).toLowerCase()}>
          {(close) => (
            <div className="flex flex-col gap-px">
              {[
                TaskStatus.NOT_STARTED,
                TaskStatus.IN_PROGRESS,
                TaskStatus.BLOCKED,
                TaskStatus.COMPLETED,
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={menuItemClass(s === status)}
                  onClick={() => (onStatus(s), close())}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
        </Slot>
        , and visible to{" "}
        <button
          type="button"
          disabled={visibilityLocked}
          onClick={() =>
            onVisibility(
              visibility === TaskVisibility.PRIVATE ? TaskVisibility.ORG : TaskVisibility.PRIVATE,
            )
          }
          className={slotClass(false)}
        >
          {visibility === TaskVisibility.PRIVATE ? "only the people on it" : "the club"}
        </button>
        .
      </p>

      <p className="text-muted-foreground text-xs">
        Click any underlined word to change it. Your choices carry over to Form.
      </p>

      <div className="-ms-2.5 flex flex-wrap gap-0.5">
        {["Description", "Involved people", "Labels"].map((what) => (
          <button
            key={what}
            type="button"
            onClick={onMore}
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-[30px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium"
          >
            <Plus className="size-3" aria-hidden="true" />
            {what}
          </button>
        ))}
      </div>
    </div>
  );
}

function slotClass(empty: boolean) {
  return cn(
    "inline cursor-pointer rounded-none border-0 border-b-2 border-dashed bg-transparent px-0.5 font-medium hover:bg-primary/10 disabled:cursor-default disabled:opacity-70",
    empty ? "text-muted-foreground border-border" : "text-primary border-primary/45",
  );
}

/** One underlined word: opens its options under it. */
function Slot({
  label,
  text,
  empty = false,
  disabled,
  children,
}: {
  label: string;
  text: string;
  empty?: boolean;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${text}`}
          className={cn(slotClass(empty), "font-medium")}
        >
          {text}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] gap-px rounded-[10px] p-1.5">
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}
