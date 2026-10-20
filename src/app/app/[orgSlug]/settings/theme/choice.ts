import { cn } from "@/lib/utils";

/**
 * A choice tile on Settings › Theme (a radio inside a label): a soft inset
 * tile, the chosen one ringed in the text colour, with the focus outline on
 * the tile when its (visually hidden) radio has keyboard focus.
 */
export function choiceClass(selected: boolean, className?: string) {
  return cn(
    "rounded-tile flex cursor-pointer items-start gap-2.5 p-3 text-sm transition-[background-color,box-shadow] duration-150",
    "has-focus-visible:outline-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
    selected ? "bg-muted/70 ring-foreground ring-2 ring-inset" : "bg-muted/40 hover:bg-muted/70",
    className,
  );
}

/** A section of Settings › Theme: a surface card with its title on space. */
export const THEME_SECTION =
  "bg-card text-card-foreground ring-foreground/6 edge rounded-card space-y-4.5 p-6 ring-1";
