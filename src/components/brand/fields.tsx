import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { pill } from "./pill";

/*
 * Form controls for Bananasplit's own pages (sign-in, sign-up, joining a
 * club): 12px-radius inputs with the banana focus ring, and the submit pill.
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

/** A form's submit: the 52px ink pill with its shadow. */
export function PrimaryButton({ className, ...props }: ComponentProps<"button">) {
  return <button className={cn(pill({ raised: true }), className)} {...props} />;
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
