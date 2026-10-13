import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A club before (or right after) joining it: its logo, or its initial on
 * pine, then its name and a line about it. Shared by the code form, the
 * invite link and "Your role in <club>".
 */
export function ClubPreview({
  name,
  logoUrl,
  detail,
  badge,
  className,
}: {
  name: string;
  /** A 64px logo variant (orgLogoUrl), or null for the initial. */
  logoUrl: string | null;
  detail?: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-cream border-ink/8 flex items-center gap-3.5 rounded-2xl border px-4 py-3.5",
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a stored 64px WebP variant
        <img src={logoUrl} alt="" className="size-11 flex-none rounded-xl object-cover" />
      ) : (
        <span className="bg-pine text-cream font-heading grid size-11 flex-none place-items-center rounded-xl text-[20px]">
          {name.trim()[0]?.toUpperCase()}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[16px] font-bold">{name}</span>
        {detail && <span className="text-ink-soft text-[13px]">{detail}</span>}
      </span>
      {badge}
    </div>
  );
}
