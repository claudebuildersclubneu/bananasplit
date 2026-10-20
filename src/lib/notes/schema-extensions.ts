import type { Extensions } from "@tiptap/core";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";

import {
  Callout,
  Column,
  Columns,
  DateChip,
  FileAttachment,
  LinkCard,
  NoteImage,
  NoteLink,
  NoteMention,
  PageBreak,
  TaskChip,
} from "./nodes";
import { SuggestionDeleteMark, SuggestionInsertMark } from "./suggestions";

/**
 * The note editor's document extensions: every node and mark a note body
 * can hold. The editor (src/components/notes/editor) adds its UI extensions
 * on top; the server builds the same schema from this list to turn a live
 * Yjs document back into contentJson and contentText
 * (src/lib/collab/note-doc.ts), and the exports read the same nodes
 * (src/server/notes/pdf.tsx, src/server/notes/docx.ts,
 * src/lib/notes/export/markdown.ts). Add a node or mark here, never only in
 * the editor, or live saves would drop it.
 *
 * `collaborative` turns off StarterKit's undo history: the Collaboration
 * extension brings its own, which only undoes the local user's changes.
 * `withNodeViews` lets the editor swap in its React node views for the
 * blocks that have one (the same nodes, so the schema is identical).
 */
export function noteSchemaExtensions({
  collaborative = false,
  override = {},
}: {
  collaborative?: boolean;
  /** Same-named replacements (the editor's node views), by extension name. */
  override?: Partial<Record<string, Extensions[number]>>;
} = {}): Extensions {
  const base: Extensions = [
    StarterKit.configure({
      link: { openOnClick: false, autolink: true },
      ...(collaborative ? { undoRedo: false } : {}),
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    // Wrapped so a wide table scrolls sideways instead of squeezing its
    // columns (each keeps cellMinWidth pixels).
    Table.configure({ resizable: false, renderWrapper: true, cellMinWidth: 64 }),
    TableRow,
    TableCell,
    TableHeader,
    // Toggles: a summary line that opens to blocks.
    Details.configure({ persist: true, HTMLAttributes: { class: "note-details" } }),
    DetailsSummary,
    DetailsContent,
    Callout,
    Columns,
    Column,
    PageBreak,
    NoteImage,
    FileAttachment,
    NoteMention,
    DateChip,
    NoteLink,
    TaskChip,
    LinkCard,
    SuggestionInsertMark,
    SuggestionDeleteMark,
  ];
  return base.map((ext) => override[ext.name] ?? ext);
}
