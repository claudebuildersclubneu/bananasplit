import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Form controls for Bananasplit's own pages (sign-in, sign-up, joining a
 * club): 12px-radius inputs with the banana focus ring, and pill buttons.
 */

export const brandInputClass =
  "bg-paper border-ink/16 focus-banana h-[50px] w-full rounded-xl border px-4 text-[15px] outline-none transition-shadow aria-invalid:border-destructive";

/** A labelled field. `aside` sits on the right of the label row (Forgot?). */
export function BrandField({
  id,
  label,
  aside,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-between text-[14px] font-semibold">
        <label htmlFor={id}>{label}</label>
        {aside}
      </div>
      {children}
    </div>
  );
}

export function BrandInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(brandInputClass, className)} {...props} />;
}

/** The ink pill: 52px, the page's main action. */
export const primaryPillClass =
  "bg-ink text-cream shadow-cta-soft hover:bg-ink-hover hover:text-cream inline-flex h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-full border-none text-[16px] font-semibold transition-colors disabled:cursor-default";

export function PrimaryButton({ className, ...props }: ComponentProps<"button">) {
  return <button className={cn(primaryPillClass, className)} {...props} />;
}

/** The "or" between the Google button and the email form. */
export function OrDivider() {
  return (
    <div className="text-ink-faint flex items-center gap-3.5 text-[13px]">
      <span className="bg-ink/12 h-px flex-1" />
      or
      <span className="bg-ink/12 h-px flex-1" />
    </div>
  );
}

/** A form-level message (a refused sign-in, a taken email). */
export function FormMessage({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "info";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "m-0 rounded-xl px-3.5 py-2.5 text-[14px] leading-normal",
        tone === "error" ? "bg-destructive/8 text-destructive" : "bg-oat text-ink-muted",
      )}
    >
      {children}
    </p>
  );
}
