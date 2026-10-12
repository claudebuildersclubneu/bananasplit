import { cn } from "@/lib/utils";

export type Avatar = {
  /** The circle's colour classes (and text colour, when it has an initial). */
  tone: string;
  initial?: string;
};

/**
 * Members' avatars, overlapping. `itemClassName` sizes the circles and sets
 * the ring that separates each from the one behind it (the colour of the
 * surface underneath); `overlap` is the negative margin that stacks them.
 */
export function AvatarStack({
  avatars,
  itemClassName,
  overlap,
  className,
}: {
  avatars: readonly Avatar[];
  itemClassName: string;
  overlap: string;
  className?: string;
}) {
  return (
    <span className={cn("flex", className)}>
      {avatars.map((avatar, i) => (
        <span
          key={i}
          className={cn("rounded-full border-2", itemClassName, avatar.tone, i > 0 && overlap)}
        >
          {avatar.initial}
        </span>
      ))}
    </span>
  );
}
