import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarSource, initialsOf } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * A member's picture everywhere a person appears (task assignees, the org
 * chart, database rows, the roster, the shell): the uploaded avatar
 * (responsive WebP variants with srcSet), then the OAuth image, then
 * initials. Works in server and client components.
 *
 *   <UserAvatar user={member} size="sm" />
 *
 * `user` is the userPublicSelect shape (id, name, image, avatar); an email
 * may be passed for the initials fallback where the viewer may see it.
 */

const SIZES = {
  xs: { px: 20, className: "size-5 text-[10px]" },
  sm: { px: 24, className: "size-6 text-xs" },
  md: { px: 32, className: "size-8 text-sm" },
  lg: { px: 40, className: "size-10 text-sm" },
  xl: { px: 64, className: "size-16 text-lg" },
  "2xl": { px: 96, className: "size-24 text-2xl" },
} as const;

export type UserAvatarSize = keyof typeof SIZES;

/**
 * Initials sit on one of five tints drawn from the theme's chart slots
 * (derive.ts avatar-1..5), picked from the person's name, so each member
 * keeps the same slot everywhere and the colour follows the club theme.
 */
const TINTS = [
  "bg-avatar-1 text-avatar-1-foreground",
  "bg-avatar-2 text-avatar-2-foreground",
  "bg-avatar-3 text-avatar-3-foreground",
  "bg-avatar-4 text-avatar-4-foreground",
  "bg-avatar-5 text-avatar-5-foreground",
] as const;

export function avatarTint(key: string | null | undefined): (typeof TINTS)[number] {
  let hash = 0;
  for (const ch of key ?? "") hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export interface UserAvatarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  avatar?: unknown;
}

export function UserAvatar({
  user,
  size = "md",
  className,
  decorative = true,
}: {
  user: UserAvatarUser;
  size?: UserAvatarSize;
  className?: string;
  /** When false, the image is announced with the person's name. */
  decorative?: boolean;
}) {
  const { px, className: sizeClass } = SIZES[size];
  const source = avatarSource(user, px);
  const label = user.name ?? user.email ?? "Member";
  return (
    <Avatar
      className={cn(sizeClass, className)}
      aria-hidden={decorative ? true : undefined}
      title={decorative ? undefined : label}
    >
      {source && (
        <AvatarImage
          src={source.src}
          srcSet={source.srcSet}
          alt={decorative ? "" : label}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      )}
      <AvatarFallback className={cn("text-[length:inherit]", avatarTint(user.name ?? user.email))}>
        {initialsOf(user.name, user.email)}
      </AvatarFallback>
    </Avatar>
  );
}
