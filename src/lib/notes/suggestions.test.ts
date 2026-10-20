// @vitest-environment node
import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection, type Transaction } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";

import { noteSchemaExtensions } from "./schema-extensions";
import {
  listSuggestions,
  resolveSuggestion,
  SKIP_SUGGESTING,
  suggestingKey,
  suggestingPlugin,
} from "./suggestions";

/**
 * Suggesting mode on a real note schema: typed text gets the insert mark,
 * deleted text comes back struck through, deleting your own suggestion
 * removes it, and accepting or rejecting turns them into plain edits.
 */

const schema = getSchema(noteSchemaExtensions());
const ana = { id: "u_ana", name: "Ana Kim" };
const tom = { id: "u_tom", name: "Tom Becker" };

function stateWith(text: string, author = ana) {
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
  });
  const state = EditorState.create({ schema, doc, plugins: [suggestingPlugin()] });
  return state.apply(state.tr.setMeta(suggestingKey, { enabled: true, author }));
}

/** Applies `build(tr)` as one user edit, as the view would. */
function edit(state: EditorState, build: (tr: Transaction) => Transaction) {
  return state.applyTransaction(build(state.tr)).state;
}

function text(state: EditorState) {
  return state.doc.textContent;
}

describe("suggesting mode", () => {
  it("marks typed text as an insertion by its author", () => {
    let state = stateWith("Doors at 6:30.");
    state = edit(state, (tr) => tr.insertText(" Badge needed.", 15));
    expect(text(state)).toBe("Doors at 6:30. Badge needed.");
    const [s] = listSuggestions(state.doc);
    expect(s).toMatchObject({ kind: "insert", text: " Badge needed.", authorName: "Ana Kim" });
  });

  it("puts deleted text back, struck through, instead of removing it", () => {
    let state = stateWith("two rounds of six teams");
    state = edit(state, (tr) => tr.delete(12, 19)); // "of six "
    expect(text(state)).toBe("two rounds of six teams");
    const [s] = listSuggestions(state.doc);
    expect(s).toMatchObject({ kind: "delete", text: "of six " });
  });

  it("shows a replacement as a deletion and an insertion", () => {
    let state = stateWith("six teams");
    state = edit(state, (tr) => tr.insertText("four", 1, 4));
    expect(text(state)).toBe("sixfour teams");
    const kinds = listSuggestions(state.doc).map((s) => [s.kind, s.text]);
    expect(kinds).toEqual([
      ["delete", "six"],
      ["insert", "four"],
    ]);
  });

  it("joins typing next to your own insertion into one suggestion", () => {
    let state = stateWith("Hi");
    state = edit(state, (tr) => tr.insertText(" t", 3));
    state = edit(state, (tr) => tr.insertText("here", 5));
    const suggestions = listSuggestions(state.doc);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.text).toBe(" there");
  });

  it("removes your own pending insertion when you delete it", () => {
    let state = stateWith("Hi");
    state = edit(state, (tr) => tr.insertText("!!", 3));
    state = edit(state, (tr) => tr.delete(3, 5));
    expect(text(state)).toBe("Hi");
    expect(listSuggestions(state.doc)).toEqual([]);
  });

  it("strikes through someone else's insertion instead of removing it", () => {
    let state = stateWith("Hi");
    state = edit(state, (tr) => tr.insertText("!!", 3));
    state = state.apply(state.tr.setMeta(suggestingKey, { author: tom }));
    state = edit(state, (tr) => tr.delete(3, 5));
    expect(text(state)).toBe("Hi!!");
    expect(listSuggestions(state.doc).map((s) => s.kind)).toEqual(["delete"]);
  });

  it("leaves the caret before the struck text after Backspace", () => {
    let state = stateWith("abc");
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 4)));
    state = edit(state, (tr) => tr.delete(3, 4));
    expect(state.selection.from).toBe(3);
  });

  it("does nothing while suggesting is off, or for skipped transactions", () => {
    let state = stateWith("abc");
    state = state.apply(state.tr.setMeta(suggestingKey, { enabled: false }));
    state = edit(state, (tr) => tr.insertText("d", 4));
    expect(listSuggestions(state.doc)).toEqual([]);
    state = state.apply(state.tr.setMeta(suggestingKey, { enabled: true }));
    state = edit(state, (tr) => tr.insertText("e", 5).setMeta(SKIP_SUGGESTING, true));
    expect(listSuggestions(state.doc)).toEqual([]);
  });
});

describe("accepting and rejecting", () => {
  function withSuggestions() {
    let state = stateWith("six teams");
    state = edit(state, (tr) => tr.insertText("four", 1, 4));
    return state;
  }

  it("accepting keeps insertions and carries out deletions", () => {
    let state = withSuggestions();
    const tr = resolveSuggestion(state, null, "accept")!;
    state = state.apply(tr);
    expect(text(state)).toBe("four teams");
    expect(listSuggestions(state.doc)).toEqual([]);
  });

  it("rejecting drops insertions and keeps the text", () => {
    let state = withSuggestions();
    state = state.apply(resolveSuggestion(state, null, "reject")!);
    expect(text(state)).toBe("six teams");
    expect(listSuggestions(state.doc)).toEqual([]);
  });

  it("decides one suggestion at a time", () => {
    let state = withSuggestions();
    const insert = listSuggestions(state.doc).find((s) => s.kind === "insert")!;
    state = state.apply(resolveSuggestion(state, insert.id, "accept")!);
    expect(listSuggestions(state.doc).map((s) => s.kind)).toEqual(["delete"]);
    expect(text(state)).toBe("sixfour teams");
  });

  it("returns null when there is nothing to decide", () => {
    expect(resolveSuggestion(stateWith("plain"), null, "accept")).toBeNull();
  });
});
