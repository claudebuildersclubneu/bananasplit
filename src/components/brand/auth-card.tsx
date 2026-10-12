import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { CoreMark, Logo } from "./logo";

/**
 * The framed card behind sign-in, sign-up and joining a club: a 1000px card
 * with a 12px paper frame, the yellow panel on the left (logo at the top,
 * `panel` at the bottom, a faint cream outline of the mark bleeding off the
 * corner) and the form on the right. Below lg the panel is hidden and the
 * logo sits above the form.
 */
export function AuthCard({
  panel = <AuthHeadline />,
  children,
  tall = false,
  formClassName,
}: {
  /** The bottom of the yellow panel; the tagline when not given. */
  panel?: ReactNode;
  children: ReactNode;
  /** Sign-up's taller card (660px instead of 620px). */
  tall?: boolean;
  /** The form column's padding and gap, when a screen differs. */
  formClassName?: string;
}) {
  return (
    <main className="grid flex-1 grid-cols-1 place-items-center px-4 py-10 sm:px-6">
      <div
        className={cn(
          "bg-paper border-ink/10 shadow-frame flex w-full max-w-[1000px] gap-3 rounded-[34px] border p-3",
          tall ? "lg:min-h-[660px]" : "lg:min-h-[620px]",
        )}
      >
        <div className="bg-peel relative hidden w-[440px] flex-none flex-col justify-between overflow-hidden rounded-[24px] p-10 lg:flex">
          <CoreMark
            size={420}
            tone="outline"
            className="pointer-events-none absolute -right-[130px] -bottom-[120px] opacity-25"
          />
          <Link href="/" className="text-ink relative w-fit" data-plain>
            <Logo tone="ink" />
          </Link>
          <div className="relative">{panel}</div>
        </div>
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col justify-center gap-5 px-5 py-8 sm:px-10 lg:px-16 lg:py-10",
            formClassName,
          )}
        >
          <Link href="/" className="text-ink w-fit lg:hidden" data-plain>
            <Logo />
          </Link>
          {children}
        </div>
      </div>
    </main>
  );
}

/** The panel's headline (the tagline unless given): Young Serif 52px, set tight. */
export function AuthHeadline({
  children = "Running your club shouldn't be bananas.",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-heading m-0 text-[52px] leading-none tracking-[-0.035em] text-balance",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** The form's title and the line under it. */
export function AuthTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow && <span className="text-honey text-[14px] font-bold">{eyebrow}</span>}
      <h1 className="font-heading m-0 text-[38px] leading-[1.05] font-normal tracking-[-0.03em]">
        {title}
      </h1>
      {description && <p className="text-ink-muted m-0 text-[16px]">{description}</p>}
    </div>
  );
}
