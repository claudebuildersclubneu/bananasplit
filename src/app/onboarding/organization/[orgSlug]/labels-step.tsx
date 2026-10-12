"use client";

import { useRef, useState, useTransition } from "react";

import {
  ContinuePill,
  DotChip,
  PreviewHeader,
  PreviewTile,
  SetupCard,
  StepBody,
  StepError,
  StepFooter,
  StepIntro,
} from "@/components/onboarding/setup-shell";
import { LABEL_COLOR_PALETTE, type LabelColor } from "@/lib/label-colors";
import { MAX_SETUP_LABELS } from "@/lib/onboarding/org";
import { cn } from "@/lib/utils";
import type { TaskLabelsSetup } from "@/server/onboarding/org-setup";

import { goToNextOrgStep, saveLabelsStepAction } from "./actions";

interface Row {
  key: string;
  id: string | null;
  name: string;
  color: LabelColor;
  taskCount: number | null;
}

/** A new club's starting labels, in the brand's four tones. */
const SUGGESTED = ["Events", "Projects", "Sponsors", "Outreach"] as const;

/** The preview's stand-in tasks while the club has none of its own. */
const SAMPLE_TASKS = [
  "Book a room for the first meeting",
  "Order supplies for the build",
  "Email sponsors about spring",
  "Plan the campus info table",
] as const;

const AVATAR_TONES = ["bg-wheat", "bg-ink", "bg-dusk", "bg-spot"] as const;

function asColor(color: string): LabelColor {
  return (LABEL_COLOR_PALETTE as readonly string[]).includes(color)
    ? (color as LabelColor)
    : LABEL_COLOR_PALETTE[0];
}

/**
 * B3 · Labels: the club's task labels (design: App screens, 05). Keep,
 * rename, recolour, remove or add; a new club starts with four suggestions.
 * The preview shows the newest tasks, or sample ones, wearing the labels.
 */
export function LabelsStep({
  orgId,
  orgSlug,
  index,
  total,
  backHref,
  setup,
}: {
  orgId: string;
  orgSlug: string;
  index: number;
  total: number;
  backHref: string;
  setup: TaskLabelsSetup;
}) {
  const fresh = setup.labels.length === 0;
  const [rows, setRows] = useState<Row[]>(() =>
    fresh
      ? SUGGESTED.map((name, i) => ({
          key: `new-${i}`,
          id: null,
          name,
          color: LABEL_COLOR_PALETTE[i],
          taskCount: null,
        }))
      : setup.labels.map((l) => ({ key: l.id, ...l, color: asColor(l.color) })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const added = useRef(0);
  const list = useRef<HTMLUListElement>(null);

  function update(key: string, patch: Partial<Row>) {
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function add() {
    const key = `added-${added.current++}`;
    const used = new Set(rows.map((r) => r.color));
    const color = LABEL_COLOR_PALETTE.find((c) => !used.has(c)) ?? LABEL_COLOR_PALETTE[0];
    setRows([...rows, { key, id: null, name: "", color, taskCount: null }]);
    setTimeout(
      () => list.current?.querySelector<HTMLInputElement>(`[data-key="${key}"]`)?.focus(),
      0,
    );
  }

  function save() {
    setError(null);
    start(async () => {
      const result = await saveLabelsStepAction(orgId, {
        labels: rows.map((r) => ({ id: r.id, name: r.name, color: r.color })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await goToNextOrgStep(orgSlug, "labels");
    });
  }

  const named = rows.filter((r) => r.name.trim());
  const preview =
    setup.tasks.length > 0
      ? setup.tasks.map((t) => ({
          title: t.title,
          label: rows.find((r) => r.id && t.labelIds.includes(r.id) && r.name.trim()),
        }))
      : SAMPLE_TASKS.map((title, i) => ({
          title,
          label: named.length ? named[i % named.length] : undefined,
        }));

  return (
    <SetupCard
      preview={
        <>
          <PreviewHeader meta="This week · Board" />
          {preview.map((task, i) => (
            <PreviewTile key={`${task.title}-${i}`}>
              <span className="text-[14px] font-semibold">{task.title}</span>
              <span className="flex items-center justify-between gap-3">
                {task.label ? (
                  <DotChip color={task.label.color}>{task.label.name}</DotChip>
                ) : (
                  <span className="text-ink-faint text-[12px]">No label</span>
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-[22px] flex-none rounded-full",
                    AVATAR_TONES[i % AVATAR_TONES.length],
                  )}
                />
              </span>
            </PreviewTile>
          ))}
          {setup.tasks.length === 0 && (
            <p className="text-ink-faint m-0 mt-auto text-[12px]">
              Sample tasks, to show how labels look.
            </p>
          )}
        </>
      }
    >
      <StepIntro index={index} total={total} title="How does your club sort its work?">
        {fresh
          ? "Labels group your club's tasks. We suggested four to start. Keep, rename or add your own."
          : "Labels group your club's tasks. Here are the ones you have. Keep, rename or add your own."}
      </StepIntro>

      <StepBody>
        <ul ref={list} className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((row) => (
            <li
              key={row.key}
              className="bg-paper border-ink/10 focus-within-banana flex h-[50px] items-center gap-3 rounded-xl border px-4"
            >
              <button
                type="button"
                aria-label={`Change the colour of ${row.name || "this label"}`}
                title="Change colour"
                onClick={() => {
                  const i = LABEL_COLOR_PALETTE.indexOf(row.color);
                  update(row.key, {
                    color: LABEL_COLOR_PALETTE[(i + 1) % LABEL_COLOR_PALETTE.length],
                  });
                }}
                className="grid size-5 flex-none cursor-pointer place-items-center rounded-full border-none bg-transparent p-0"
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />
              </button>
              <input
                data-key={row.key}
                aria-label="Label name"
                value={row.name}
                maxLength={40}
                placeholder="Name this label"
                onChange={(e) => update(row.key, { name: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none"
              />
              <span className="text-ink-soft flex-none text-[13px]">
                {row.taskCount === null
                  ? "New"
                  : `${row.taskCount} ${row.taskCount === 1 ? "item" : "items"}`}
              </span>
              <button
                type="button"
                aria-label={`Remove ${row.name || "this label"}`}
                onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                className="text-ink-ghost hover:text-ink flex-none cursor-pointer border-none bg-transparent p-0 text-[18px] leading-none"
              >
                ×
              </button>
            </li>
          ))}
          {rows.length < MAX_SETUP_LABELS && (
            <li>
              <button
                type="button"
                onClick={add}
                className="border-ink/25 text-ink-muted hover:bg-cream flex h-[50px] w-full cursor-pointer items-center rounded-xl border border-dashed bg-transparent px-4 text-left text-[15px] font-semibold transition-colors"
              >
                + Add a label
              </button>
            </li>
          )}
        </ul>
      </StepBody>

      <StepError message={error} />
      <StepFooter
        back={{ href: backHref }}
        skip={{ onClick: () => start(() => goToNextOrgStep(orgSlug, "labels")), disabled: pending }}
      >
        <ContinuePill
          pending={pending}
          onClick={save}
          disabled={rows.some((r) => !r.name.trim())}
        />
      </StepFooter>
    </SetupCard>
  );
}
