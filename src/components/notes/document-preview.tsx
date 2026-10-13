"use client";

import { EditorContent, useEditor } from "@tiptap/react";

import { noteSchemaExtensions } from "@/lib/notes/schema-extensions";

/**
 * A Word document shown in the app: its HTML read into a read-only editor
 * with the note schema, so it looks like a note and nothing outside the
 * schema (scripts, styles, frames) survives. In a file of its own so pages
 * that only sometimes show it can load the editor libraries on demand.
 */
export function DocumentPreview({ html }: { html: string }) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: noteSchemaExtensions(),
    content: html || "<p></p>",
    editorProps: {
      attributes: {
        class: "tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none",
      },
    },
  });
  if (!editor) return <div className="bg-muted/40 h-64 animate-pulse rounded-lg" />;
  return <EditorContent editor={editor} />;
}
