import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  type LucideIcon,
  Minus,
  Quote,
  SquareCode,
  Table as TableIcon,
} from "lucide-react";
import type { Editor, Range } from "@tiptap/core";

import { insertTable } from "./table-tools";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  run: (editor: Editor, range: Range) => void;
}

export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Big section heading",
    icon: Heading1,
    keywords: ["h1", "heading", "title"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    keywords: ["h2", "heading", "subtitle"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    keywords: ["h3", "heading"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bullet list",
    description: "Simple unordered list",
    icon: List,
    keywords: ["bullet", "list", "ul"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "List with numbers",
    icon: ListOrdered,
    keywords: ["ordered", "list", "ol", "number"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task list",
    description: "Checkboxes for to-dos",
    icon: ListChecks,
    keywords: ["task", "todo", "checkbox"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Blockquote",
    description: "Quoted text",
    icon: Quote,
    keywords: ["quote", "blockquote"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    description: "Monospaced code with syntax highlighting off",
    icon: SquareCode,
    keywords: ["code", "codeblock", "pre"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Table",
    description: "3 × 3 to start, or type a size: /4x6",
    icon: TableIcon,
    keywords: ["table", "grid"],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      insertTable(editor, { rows: 3, cols: 3 });
    },
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    icon: Minus,
    keywords: ["divider", "hr", "rule", "separator"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

/** "/4x6" (or "/table 4x6"): a table of that size, rows by columns. */
export function sizedTableItem(size: { rows: number; cols: number }): SlashCommandItem {
  return {
    title: `Table ${size.rows} × ${size.cols}`,
    description: `${size.rows} rows, ${size.cols} columns`,
    icon: TableIcon,
    keywords: [],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      insertTable(editor, size);
    },
  };
}
