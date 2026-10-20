import { mergeAttributes, Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";

/**
 * The note blocks beyond StarterKit, tables and task lists (Moonstone
 * 13.2-13.4). Each is plain schema here, with no browser code, so the
 * server builds the same schema for live saves, search text and exports
 * (src/lib/notes/schema-extensions.ts). The editor gives some of them a
 * React node view on top (src/components/notes/editor/node-views.tsx).
 *
 * Inline atoms (mention, date, page link) say what they are in
 * `renderText`, so contentText (search) and the plain-text exports read
 * them as words.
 */

/** "info" | "success" | "warning" | "danger": the callout's tint. */
export const CALLOUT_TONES = ["info", "success", "warning", "danger"] as const;
export type CalloutTone = (typeof CALLOUT_TONES)[number];

/** A tinted box with an emoji, holding any blocks. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      tone: {
        default: "info",
        parseHTML: (el) => {
          const tone = el.getAttribute("data-tone");
          return (CALLOUT_TONES as readonly string[]).includes(tone ?? "") ? tone : "info";
        },
        renderHTML: (attrs) => ({ "data-tone": attrs.tone }),
      },
      emoji: {
        default: "💡",
        parseHTML: (el) => el.getAttribute("data-emoji") || "💡",
        renderHTML: (attrs) => ({ "data-emoji": attrs.emoji }),
      },
    };
  },
  parseHTML: () => [{ tag: 'div[data-type="callout"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-type": "callout", class: "note-callout" }),
    0,
  ],
});

/** Side-by-side columns: two or three `column`s, each holding blocks. */
export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  defining: true,
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-type="columns"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-type": "columns", class: "note-columns" }),
    0,
  ],
});

export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-type="column"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-type": "column", class: "note-column" }),
    0,
  ],
});

/** A hard page break: a new sheet in Document mode and in the PDF. */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: 'div[data-type="page-break"]' }],
  renderHTML: () => ["div", { "data-type": "page-break", class: "note-page-break" }],
  renderText: () => "\n",
});

/**
 * An image uploaded to the club's files (/api/orgs/{orgId}/files), so it
 * counts toward storage and is served behind the same access checks.
 * `fileId` names the OrgFile; `src` is its URL.
 */
export const NoteImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fileId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-file-id"),
        renderHTML: (attrs) => (attrs.fileId ? { "data-file-id": attrs.fileId } : {}),
      },
    };
  },
}).configure({ inline: false, allowBase64: false });

/** An uploaded file (not an image) as a card that opens it. */
export const FileAttachment = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      fileId: { default: null },
      name: { default: "File" },
      contentType: { default: null },
      sizeBytes: { default: null },
    };
  },
  parseHTML: () => [
    {
      tag: 'div[data-type="file"]',
      getAttrs: (el) => ({
        fileId: el.getAttribute("data-file-id"),
        name: el.getAttribute("data-name") || "File",
        contentType: el.getAttribute("data-content-type"),
        sizeBytes: Number(el.getAttribute("data-size")) || null,
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "div",
    {
      "data-type": "file",
      "data-file-id": node.attrs.fileId,
      "data-name": node.attrs.name,
      "data-content-type": node.attrs.contentType,
      "data-size": node.attrs.sizeBytes,
      class: "note-file",
    },
    String(node.attrs.name),
  ],
  renderText: ({ node }) => String(node.attrs.name),
});

/** A date as a chip, "@Wed, Oct 21": `date` is a YYYY-MM-DD day. */
export const DateChip = Node.create({
  name: "dateChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { date: { default: null } };
  },
  parseHTML: () => [
    { tag: "time[data-type='date']", getAttrs: (el) => ({ date: el.getAttribute("datetime") }) },
  ],
  renderHTML: ({ node }) => [
    "time",
    { "data-type": "date", datetime: node.attrs.date, class: "note-chip" },
    String(node.attrs.date ?? ""),
  ],
  renderText: ({ node }) => String(node.attrs.date ?? ""),
});

/**
 * A link to another note (a page), kept by id so backlinks can find it and
 * a rename shows everywhere; `title` is the name when it was linked, for
 * exports and for readers who can't see the page.
 */
export const NoteLink = Node.create({
  name: "noteLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { noteId: { default: null }, title: { default: "Untitled" } };
  },
  parseHTML: () => [
    {
      tag: "a[data-type='note-link']",
      getAttrs: (el) => ({
        noteId: el.getAttribute("data-note-id"),
        title: el.textContent || "Untitled",
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "a",
    { "data-type": "note-link", "data-note-id": node.attrs.noteId, class: "note-chip" },
    String(node.attrs.title),
  ],
  renderText: ({ node }) => String(node.attrs.title),
});

/**
 * A live task: the chip reads the task (title, status, due date) and checks
 * it off. `title` is the title when it was inserted, for exports.
 */
export const TaskChip = Node.create({
  name: "taskChip",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return { taskId: { default: null }, title: { default: "Task" } };
  },
  parseHTML: () => [
    {
      tag: "div[data-type='task-chip']",
      getAttrs: (el) => ({
        taskId: el.getAttribute("data-task-id"),
        title: el.textContent || "Task",
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "div",
    { "data-type": "task-chip", "data-task-id": node.attrs.taskId, class: "note-task" },
    String(node.attrs.title),
  ],
  renderText: ({ node }) => String(node.attrs.title),
});

/** "database" | "poll": what a link card opens. */
export const LINK_CARD_KINDS = ["database", "poll"] as const;
export type LinkCardKind = (typeof LINK_CARD_KINDS)[number];

/** A card that opens a club database or a poll (`path` is relative to the club). */
export const LinkCard = Node.create({
  name: "linkCard",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      kind: { default: "database" },
      path: { default: "" },
      title: { default: "" },
    };
  },
  parseHTML: () => [
    {
      tag: "div[data-type='link-card']",
      getAttrs: (el) => ({
        kind: el.getAttribute("data-kind") || "database",
        path: el.getAttribute("data-path") || "",
        title: el.textContent || "",
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "div",
    {
      "data-type": "link-card",
      "data-kind": node.attrs.kind,
      "data-path": node.attrs.path,
      class: "note-link-card",
    },
    String(node.attrs.title),
  ],
  renderText: ({ node }) => String(node.attrs.title),
});

/** @person: `id` is the member's user id, `label` their name when mentioned. */
export const NoteMention = Mention.configure({
  renderText: ({ node }) => `@${node.attrs.label ?? "someone"}`,
  renderHTML: ({ node }) => [
    "span",
    { "data-type": "mention", "data-id": node.attrs.id, class: "note-mention" },
    `@${node.attrs.label ?? "someone"}`,
  ],
});

/** Inline-node types whose text is their attrs (for converters). */
export const NOTE_ATOM_TYPES = [
  "mention",
  "dateChip",
  "noteLink",
  "taskChip",
  "linkCard",
  "fileAttachment",
] as const;
