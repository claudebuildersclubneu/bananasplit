/**
 * How big a note may be. Notes are saved through Server Actions (importNote,
 * updateNote), whose request body Next caps at serverActions.bodySizeLimit
 * in next.config.ts ("3mb"). The browser checks a note against these before
 * sending it, so a document that is too big gets a plain message instead of
 * a request the server refuses without saying why; the actions check the
 * same character limits again.
 */

/** contentJson: the JSON-encoded editor document. */
export const NOTE_JSON_MAX_CHARS = 2_000_000;

/** contentText: the plain text kept for search and snippets. */
export const NOTE_TEXT_MAX_CHARS = 200_000;

/**
 * The body as it travels: both strings JSON-encoded (quotes and backslashes
 * escaped) in UTF-8. Kept under the 3 MB action limit (3,145,728 bytes) with
 * room for the title and the other fields.
 */
export const NOTE_BODY_MAX_BYTES = 2_900_000;

export const NOTE_TOO_BIG =
  "This document is too big to save as a note. Try splitting it into smaller notes.";

/** True when a note body would not get through, or would be refused by the action. */
export function noteBodyTooBig(contentJson: string, contentText: string): boolean {
  if (contentJson.length > NOTE_JSON_MAX_CHARS || contentText.length > NOTE_TEXT_MAX_CHARS) {
    return true;
  }
  // A character takes at most 6 bytes once encoded (a "\u0000" escape), so
  // short bodies need no encoding to know they fit.
  if ((contentJson.length + contentText.length) * 6 <= NOTE_BODY_MAX_BYTES) return false;
  const bytes = new TextEncoder().encode(JSON.stringify([contentJson, contentText])).length;
  return bytes > NOTE_BODY_MAX_BYTES;
}
