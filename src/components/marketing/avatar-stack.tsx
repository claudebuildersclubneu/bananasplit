import { UserAvatar, type UserAvatarSize } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

/**
 * Sample members' faces, overlapping by 8px (Moonstone's avatar stacks):
 * tinted initials from the theme's avatar slots, each ringed in the colour
 * of the surface underneath (`ring`, e.g. "ring-card", or
 * "ring-(--ring-bg)" on a block card), three faces then "+N".
 */
export function AvatarStack({
  names,
  more,
  size = "md",
  ring = "ring-card",
  className,
}: {
  names: readonly string[];
  /** The "+N" after the faces. */
  more?: number;
  size?: UserAvatarSize;
  ring?: string;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cn("flex items-center", className)}>
      {names.map((name, i) => (
        <UserAvatar
          key={name}
          user={{ name }}
          size={size}
          className={cn("ring-2", ring, i > 0 && "-ml-2")}
        />
      ))}
      {more !== undefined && more > 0 && (
        <span
          className={cn(
            "-ml-2 grid h-8 min-w-8 place-items-center rounded-full bg-[color-mix(in_oklab,currentColor_16%,transparent)] px-1.5 text-[12px] font-semibold tabular-nums ring-2",
            size === "sm" && "h-6 min-w-6 text-[11px]",
            ring,
          )}
        >
          +{more}
        </span>
      )}
    </span>
  );
}
