import { Extension, type Editor } from "@tiptap/core";

import {
  listSuggestions,
  resolveSuggestion,
  suggestingKey,
  suggestingPlugin,
  type NoteSuggestion,
  type SuggestionAuthor,
} from "@/lib/notes/suggestions";

/** Suggesting mode in the editor (the logic is src/lib/notes/suggestions.ts). */
export const Suggesting = Extension.create({
  name: "noteSuggesting",
  addProseMirrorPlugins: () => [suggestingPlugin()],
});

export function setSuggesting(editor: Editor, enabled: boolean, author: SuggestionAuthor | null) {
  if (editor.isDestroyed) return;
  editor.view.dispatch(editor.state.tr.setMeta(suggestingKey, { enabled, author }));
}

export function isSuggesting(editor: Editor): boolean {
  return Boolean(suggestingKey.getState(editor.state)?.enabled);
}

export function editorSuggestions(editor: Editor): NoteSuggestion[] {
  return listSuggestions(editor.state.doc);
}

/** Accepts or rejects one suggestion (or all, with `id` null). */
export function decideSuggestion(
  editor: Editor,
  id: string | null,
  decision: "accept" | "reject",
): boolean {
  const tr = resolveSuggestion(editor.state, id, decision);
  if (!tr) return false;
  editor.view.dispatch(tr);
  return true;
}
