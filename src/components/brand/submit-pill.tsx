"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

import { pill, type PillProps } from "./pill";

/**
 * A pill that submits its form and is disabled, with `pendingLabel`, until
 * the form's action finishes. For one-shot actions like confirming an
 * email: a double click would otherwise send the form twice, and the second
 * post finds the link already used.
 */
export function SubmitPill({
  children,
  pendingLabel,
  className,
  ...variants
}: PillProps & {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn(pill(variants), className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
