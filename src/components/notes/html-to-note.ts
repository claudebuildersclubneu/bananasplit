import { generateJSON, generateText } from "@tiptap/core";

import { NOTE_TEXT_MAX_CHARS } from "@/app/app/[orgSlug]/notes/limits";
import { noteSchemaExtensions } from "@/lib/notes/schema-extensions";

/**
 * HTML (an imported document or a template) as a note body for importNote:
 * the editor's JSON, stringified, and its plain text. Callers import this
 * on demand (`await import(...)`), so the editor libraries load only when a
 * note is actually being made.
 */
export function htmlToNoteBody(html: string): { contentJson: string; contentText: string } {
  const extensions = noteSchemaExtensions();
  const json = generateJSON(html || "<p></p>", extensions);
  return {
    contentJson: JSON.stringify(json),
    contentText: generateText(json, extensions).slice(0, NOTE_TEXT_MAX_CHARS),
  };
}
