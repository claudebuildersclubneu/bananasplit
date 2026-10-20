import { Extension, type Editor } from "@tiptap/core";

/**
 * What the slash menu and block menu ask the page for: things that need a
 * dialog, an upload or a server call (insert a task, pick a database or a
 * poll, upload an image or a file, make a subpage). The note editor sets
 * these on mount (editor.storage.noteHooks.hooks); the schema never sees
 * them.
 */
export interface NoteHooks {
  /** Who and what the @ and [[ menus offer. */
  people: () => { id: string; name: string | null; image?: string | null }[];
  pages: () => { id: string; title: string; icon: string | null }[];
  selfId: () => string | null;
  noteId: () => string | null;
  /** A comment highlight was clicked. */
  clickThread: (id: string) => void;
  /** Pasted or dropped pictures; false when they weren't taken. */
  uploadImages: (files: File[]) => boolean;
  uploadImage: () => void;
  uploadFile: () => void;
  insertTask: () => void;
  insertEmbed: (kind: "database" | "poll") => void;
  createSubpage: () => void;
}

interface HooksStorage {
  hooks: NoteHooks | null;
}

export const NoteHooksExtension = Extension.create<Record<string, never>, HooksStorage>({
  name: "noteHooks",
  addStorage: () => ({ hooks: null }),
});

export function noteHooks(editor: Editor): NoteHooks | null {
  const storage = (editor.storage as unknown as Record<string, HooksStorage | undefined>).noteHooks;
  return storage?.hooks ?? null;
}

export function setNoteHooks(editor: Editor, hooks: NoteHooks | null) {
  const storage = (editor.storage as unknown as Record<string, HooksStorage | undefined>).noteHooks;
  if (storage) storage.hooks = hooks;
}
