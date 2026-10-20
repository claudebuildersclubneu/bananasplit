/**
 * A note as Markdown (the note page's "…" › Download Markdown): the
 * ProseMirror JSON the editor saves, written as GitHub-flavoured Markdown.
 * Every node the note schema has is covered (src/lib/notes/schema-extensions.ts);
 * anything unknown falls back to its text, so nothing is silently dropped.
 *
 * - Callouts become quotes led by their emoji, toggles a bold summary with
 *   the content under it, columns their columns one after another.
 * - Mentions read "@Name", dates their day, page links and link cards
 *   become links (relative to the club, given `baseUrl`), task chips
 *   checklist lines, images and files links to the club's file.
 * - Pending suggestions show: insertions as plain text, deletions struck
 *   through (~~like this~~).
 */

export interface MdNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: MdNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export interface MarkdownOptions {
  /** The club's base URL ("https://app.example/app/robotics"), for page and file links. */
  baseUrl?: string;
  /** The org id, for file links (/api/orgs/{orgId}/files/{fileId}). */
  orgId?: string;
  /** Task chips' live state, by task id (checked when done). */
  taskDone?: Record<string, boolean>;
}

const SAFE_LINK = /^(https?:|mailto:|tel:|\/)/i;

function escapeText(text: string): string {
  return text.replace(/([\\`*_[\]#<>|~])/g, "\\$1");
}

function kids(node: MdNode): MdNode[] {
  return Array.isArray(node.content) ? node.content : [];
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function inline(nodes: MdNode[], opts: MarkdownOptions): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return markText(node, opts);
        case "hardBreak":
          return "  \n";
        case "mention":
          return `@${escapeText(str(node.attrs?.label) || "someone")}`;
        case "dateChip":
          return str(node.attrs?.date);
        case "noteLink":
          return `[${escapeText(str(node.attrs?.title) || "Untitled")}](${link(opts, `notes/${str(node.attrs?.noteId)}`)})`;
        default:
          return escapeText(plain(node));
      }
    })
    .join("");
}

function markText(node: MdNode, opts: MarkdownOptions): string {
  const marks = node.marks ?? [];
  const has = (type: string) => marks.some((m) => m.type === type);
  let text = has("code")
    ? `\`${str(node.text).replace(/`/g, "\\`")}\``
    : escapeText(str(node.text));
  if (!text.trim()) return text;
  // Keep surrounding spaces outside the markers ("** bold**" isn't bold).
  const lead = text.match(/^\s*/)![0];
  const trail = text.match(/\s*$/)![0];
  text = text.trim();
  if (has("bold")) text = `**${text}**`;
  if (has("italic")) text = `*${text}*`;
  if (has("strike") || has("suggestionDelete")) text = `~~${text}~~`;
  if (has("underline")) text = `<u>${text}</u>`;
  const href = str(marks.find((m) => m.type === "link")?.attrs?.href).trim();
  if (href && SAFE_LINK.test(href)) text = `[${text}](${href})`;
  void opts;
  return `${lead}${text}${trail}`;
}

function link(opts: MarkdownOptions, path: string): string {
  return opts.baseUrl ? `${opts.baseUrl.replace(/\/+$/, "")}/${path}` : path;
}

function fileUrl(opts: MarkdownOptions, fileId: string): string {
  return opts.orgId ? `/api/orgs/${opts.orgId}/files/${fileId}` : fileId;
}

/** A node's text, for the fallbacks. */
export function plain(node: MdNode): string {
  if (typeof node.text === "string") return node.text;
  if (node.type === "mention") return `@${str(node.attrs?.label)}`;
  if (node.type === "dateChip") return str(node.attrs?.date);
  if (["noteLink", "taskChip", "linkCard"].includes(node.type ?? "")) return str(node.attrs?.title);
  if (node.type === "fileAttachment") return str(node.attrs?.name);
  return kids(node)
    .map(plain)
    .join(node.type === "doc" ? "\n\n" : "");
}

function indent(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line, i) => (i === 0 || !line ? line : prefix + line))
    .join("\n");
}

function blocks(nodes: MdNode[], opts: MarkdownOptions): string {
  return nodes
    .map((n) => block(n, opts))
    .filter((b) => b !== "")
    .join("\n\n");
}

function list(node: MdNode, opts: MarkdownOptions): string {
  const start = Number(node.attrs?.start) || 1;
  return kids(node)
    .map((item, i) => {
      const marker =
        node.type === "orderedList"
          ? `${start + i}. `
          : node.type === "taskList"
            ? `- [${item.attrs?.checked === true ? "x" : " "}] `
            : "- ";
      const body = blocks(kids(item), opts);
      return marker + indent(body, " ".repeat(marker.length));
    })
    .join("\n");
}

function table(node: MdNode, opts: MarkdownOptions): string {
  const rows = kids(node).map((row) =>
    kids(row).map((cell) =>
      kids(cell)
        .map((p) => inline(kids(p), opts))
        .join(" ")
        .replace(/\n/g, " ")
        .trim(),
    ),
  );
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];
  const line = (r: string[]) => `| ${pad(r).join(" | ")} |`;
  return [
    line(rows[0]!),
    `| ${Array(width).fill("---").join(" | ")} |`,
    ...rows.slice(1).map(line),
  ].join("\n");
}

function block(node: MdNode, opts: MarkdownOptions): string {
  switch (node.type) {
    case "paragraph":
      return inline(kids(node), opts);
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
      return `${"#".repeat(level)} ${inline(kids(node), opts)}`;
    }
    case "bulletList":
    case "orderedList":
    case "taskList":
      return list(node, opts);
    case "blockquote":
      return blocks(kids(node), opts)
        .split("\n")
        .map((l) => (l ? `> ${l}` : ">"))
        .join("\n");
    case "callout": {
      const body = blocks(kids(node), opts);
      return `${str(node.attrs?.emoji) || "💡"} ${body}`
        .split("\n")
        .map((l) => (l ? `> ${l}` : ">"))
        .join("\n");
    }
    case "codeBlock": {
      const lang = str(node.attrs?.language);
      return `\`\`\`${lang}\n${plain(node)}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    case "pageBreak":
      return "---";
    case "table":
      return table(node, opts);
    case "details": {
      const [summary, content] = kids(node);
      const head = summary ? inline(kids(summary), opts) : "";
      const body = content ? blocks(kids(content), opts) : "";
      return [`**${head || "Details"}**`, body].filter(Boolean).join("\n\n");
    }
    case "columns":
      return kids(node)
        .map((col) => blocks(kids(col), opts))
        .filter(Boolean)
        .join("\n\n");
    case "image": {
      const src = node.attrs?.fileId ? fileUrl(opts, str(node.attrs.fileId)) : str(node.attrs?.src);
      return `![${escapeText(str(node.attrs?.alt))}](${src})`;
    }
    case "fileAttachment":
      return `[${escapeText(str(node.attrs?.name) || "File")}](${fileUrl(opts, str(node.attrs?.fileId))})`;
    case "taskChip": {
      const done = opts.taskDone?.[str(node.attrs?.taskId)] === true;
      return `- [${done ? "x" : " "}] ${escapeText(str(node.attrs?.title) || "Task")}`;
    }
    case "linkCard":
      return `[${escapeText(str(node.attrs?.title) || "Open")}](${link(opts, str(node.attrs?.path))})`;
    default: {
      const text = plain(node);
      return text ? escapeText(text) : "";
    }
  }
}

/** The whole note: its title as the first heading, then the body. */
export function noteToMarkdown(
  title: string,
  contentJson: unknown,
  opts: MarkdownOptions = {},
): string {
  const doc = (contentJson ?? {}) as MdNode;
  const body = blocks(kids(doc), opts);
  const heading = `# ${escapeText(title.trim() || "Untitled note")}`;
  return `${[heading, body].filter(Boolean).join("\n\n")}\n`;
}
