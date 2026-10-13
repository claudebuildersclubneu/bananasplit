/**
 * An event's cover image (Event.rsvpCover, written by the cover upload
 * route): { key, s480, s960, updatedAt }, each sNNN the public URL of a
 * square WebP crop. Pure and client-safe.
 */

export interface RsvpCover {
  s480: string;
  s960: string;
}

function isUrl(value: unknown): value is string {
  return typeof value === "string" && (value.startsWith("/") || value.startsWith("https://"));
}

export function rsvpCover(value: unknown): RsvpCover | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!isUrl(v.s480) || !isUrl(v.s960)) return null;
  return { s480: v.s480, s960: v.s960 };
}
