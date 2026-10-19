"use client";

import Link from "next/link";
import { useCallback, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The block card (Moonstone): a solid card that points at something that
 * needs you. Each tone means exactly one thing, and the kicker says it in
 * words too, so colour is never the only signal:
 *
 * - quiet:  coming up (meetings, events, deadlines that need nothing yet)
 * - alert:  act now (due today, overdue, urgent, blocked on you)
 * - answer: your answer (a poll, an RSVP or a review waiting on you)
 * - goal:   progress toward a goal (RSVPs, setup steps, a budget)
 *
 * Colours come from derive.ts (block-*), so they follow the club theme.
 * The card lifts and tilts slightly toward the pointer, with a soft glare
 * that follows it (off under reduced motion). With `href` the title is a
 * stretched link; `action` (a ••• menu) stays clickable above it.
 */

export type BlockTone = "quiet" | "alert" | "answer" | "goal";

const TONES: Record<BlockTone, string> = {
  quiet:
    "bg-block-quiet text-block-quiet-foreground ring-1 ring-inset ring-block-quiet-foreground/10 [--meta:var(--block-quiet-meta)] [--ring-bg:var(--block-quiet)]",
  alert:
    "bg-block-alert text-block-alert-foreground [--meta:var(--block-alert-meta)] [--ring-bg:var(--block-alert)]",
  answer:
    "bg-block-answer text-block-answer-foreground [--meta:var(--block-answer-meta)] [--ring-bg:var(--block-answer)]",
  goal: "bg-block-goal text-block-goal-foreground [--meta:var(--block-goal-meta)] [--ring-bg:var(--block-goal)]",
};

export function blockToneClass(tone: BlockTone) {
  return TONES[tone];
}

export function BlockCard({
  tone,
  kicker,
  title,
  subtitle,
  figure,
  figureLabel,
  aside,
  action,
  href,
  children,
  className,
}: {
  tone: BlockTone;
  /** The line that says what kind of block this is: "Due today", "Tomorrow · 7:00 PM". */
  kicker: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** The big number in the footer ("2 of 3", "8"). */
  figure?: ReactNode;
  figureLabel?: ReactNode;
  /** Footer right: usually an avatar stack. */
  aside?: ReactNode;
  /** Top right: usually a ••• menu or an ↗ link. */
  action?: ReactNode;
  href?: string;
  children?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  const onMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || event.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width;
    const y = (event.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${((x - 0.5) * 7).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y) * 7).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, []);

  return (
    <article
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        "group/block rounded-block relative flex min-h-[13.75rem] min-w-0 flex-col p-5 transition-[transform,box-shadow] duration-250 ease-(--ease-ink)",
        "hover:shadow-e2 [transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))_translateY(var(--lift,0px))] hover:[--lift:-3px] motion-reduce:transform-none",
        // A soft top light on every block, and a glare that follows the pointer.
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-linear-to-b before:from-white/7 before:to-transparent before:to-45%",
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(280px_200px_at_var(--mx,50%)_var(--my,0%),var(--glare),transparent_65%)] after:opacity-0 after:transition-opacity after:duration-300 hover:after:opacity-100",
        TONES[tone],
        className,
      )}
    >
      <div className="relative flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-(--meta)">{kicker}</span>
        {action && <div className="relative z-10 flex items-center gap-1.5">{action}</div>}
      </div>
      {title && (
        <h3 className="display-title mt-3.5 mb-1.5 text-[23px]">
          {href ? (
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-current"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
      )}
      {subtitle && <p className="text-sm text-(--meta)">{subtitle}</p>}
      {children}
      {(figure !== undefined || aside) && (
        <div className="relative mt-auto flex items-end justify-between gap-3 pt-4.5">
          <div className="min-w-0">
            {figure !== undefined && <b className="numeral block text-[26px]">{figure}</b>}
            {figureLabel && (
              <span className="text-[13px] font-medium text-(--meta)">{figureLabel}</span>
            )}
          </div>
          {aside}
        </div>
      )}
    </article>
  );
}
