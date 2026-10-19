import { cn } from "@/lib/utils";

/**
 * The tool capsule's parts (the glass pill at the top right of every page):
 * 40px round buttons that press to 94%, and a short hairline between
 * groups. Shared with the user menu's avatar and the notification bell.
 */
export const capsuleButtonClass = cn(
  "focus-glow text-foreground relative grid size-10 shrink-0 place-items-center rounded-full outline-none",
  "transition-[background-color,scale] duration-150 ease-(--ease-ink) hover:bg-muted active:scale-[0.94] aria-expanded:bg-muted",
  "disabled:opacity-50 aria-disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100",
);

export function CapsuleSeparator({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("bg-border mx-1 h-[22px] w-px shrink-0", className)} />
  );
}
