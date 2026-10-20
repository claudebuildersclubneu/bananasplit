import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * Document mode's sheets (Moonstone 13.3): visual page breaks on the
 * paper. After every change the top-level blocks are measured where they
 * would sit without breaks, and a block that would cross the bottom margin
 * starts the next sheet: a widget before it fills out the page, draws the
 * gap between sheets (with the footer and the next header), and pushes it
 * down. A page break block always starts a new sheet. Widgets only: the
 * note's content never changes, so this is safe in a live note.
 *
 * The PDF export paginates the same paper the same way (react-pdf breaks
 * blocks at the margin and honours page break blocks), so sheets match
 * what prints, give or take a line where the PDF's font wraps differently.
 */

export interface PaginationOptions {
  /** Writable height of one sheet, px. */
  contentHeight: number;
  /** Top and bottom margin, px. */
  margin: number;
  /** Space between sheets, px. */
  gap: number;
  header: string;
  footer: string;
  enabled: boolean;
}

interface Break {
  pos: number;
  /** White space left on the page, before the margin. */
  fill: number;
  page: number;
}

interface PaginationState {
  breaks: Break[];
  /** White space after the last block, filling the last sheet. */
  tail: number;
  pages: number;
  decorations: DecorationSet;
}

export const paginationKey = new PluginKey<PaginationState>("notePagination");

const GAP_CLASS = "note-page-gap";

function gapWidget(b: Break, options: PaginationOptions): HTMLElement {
  const el = document.createElement("div");
  el.className = GAP_CLASS;
  el.contentEditable = "false";
  el.setAttribute("aria-hidden", "true");
  el.style.setProperty("--fill", `${Math.max(0, b.fill)}px`);
  el.style.setProperty("--margin", `${options.margin}px`);
  el.style.setProperty("--gap", `${options.gap}px`);
  const footer = document.createElement("div");
  footer.className = "note-page-band note-page-footer";
  footer.innerHTML = "";
  const left = document.createElement("span");
  left.textContent = options.footer;
  const right = document.createElement("span");
  right.textContent = `${b.page}`;
  footer.append(left, right);
  const desk = document.createElement("div");
  desk.className = "note-page-desk";
  const header = document.createElement("div");
  header.className = "note-page-band note-page-header";
  header.textContent = options.header;
  el.append(footer, desk, header);
  return el;
}

function tailWidget(height: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "note-page-tail";
  el.contentEditable = "false";
  el.setAttribute("aria-hidden", "true");
  el.style.height = `${Math.max(0, height)}px`;
  return el;
}

function decorationsFor(
  view: EditorView,
  breaks: Break[],
  tail: number,
  options: PaginationOptions,
) {
  const doc = view.state.doc;
  return DecorationSet.create(doc, [
    ...breaks.map((b) =>
      Decoration.widget(b.pos, () => gapWidget(b, options), {
        side: -1,
        key: `gap-${b.page}-${Math.round(b.fill)}`,
        ignoreSelection: true,
      }),
    ),
    Decoration.widget(doc.content.size, () => tailWidget(tail), {
      side: 1,
      key: `tail-${Math.round(tail)}`,
      ignoreSelection: true,
    }),
  ]);
}

/** Where the breaks go, measured from the blocks' natural positions. */
function measure(view: EditorView, options: PaginationOptions) {
  const root = view.dom as HTMLElement;
  const page = options.contentHeight;
  const breaks: Break[] = [];
  let shift = 0;
  let pageTop = 0;
  let lastBottom = 0;
  let lastMargin = 0;
  let pageNumber = 1;
  let forceBreakNext = false;

  const blocks: { el: HTMLElement; pos: number; isBreak: boolean }[] = [];
  view.state.doc.forEach((node, offset) => {
    const el = view.nodeDOM(offset);
    if (el instanceof HTMLElement) {
      blocks.push({ el, pos: offset, isBreak: node.type.name === "pageBreak" });
    }
  });

  const gaps = new Map<Element, number>();
  for (const child of Array.from(root.children)) {
    if (child.classList.contains(GAP_CLASS)) gaps.set(child, (child as HTMLElement).offsetHeight);
  }

  let gapIndex = 0;
  const gapEls = [...gaps.keys()];
  for (const block of blocks) {
    // Remove the height of every gap widget sitting before this block.
    while (
      gapIndex < gapEls.length &&
      gapEls[gapIndex]!.compareDocumentPosition(block.el) & Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      shift += gaps.get(gapEls[gapIndex]!) ?? 0;
      gapIndex++;
    }
    const top = block.el.offsetTop - shift;
    const bottom = top + block.el.offsetHeight;
    const used = bottom - pageTop;
    if (forceBreakNext || (used > page && top > pageTop)) {
      breaks.push({
        pos: block.pos,
        fill: page - (lastBottom - pageTop) - lastMargin,
        page: pageNumber,
      });
      pageNumber++;
      pageTop = top;
      forceBreakNext = false;
    }
    // A block taller than a sheet runs on; the next sheet starts where it ends.
    while (bottom - pageTop > page) {
      pageTop += page;
      pageNumber++;
    }
    lastBottom = bottom;
    lastMargin = parseFloat(getComputedStyle(block.el).marginBottom) || 0;
    if (block.isBreak) forceBreakNext = true;
  }
  return { breaks, tail: page - (lastBottom - pageTop) - lastMargin, pages: pageNumber };
}

function same(a: Break[], b: Break[]) {
  return (
    a.length === b.length &&
    a.every((x, i) => x.pos === b[i]!.pos && Math.abs(x.fill - b[i]!.fill) < 1)
  );
}

export const Pagination = Extension.create<PaginationOptions>({
  name: "notePagination",
  addOptions: () => ({
    contentHeight: 864,
    margin: 96,
    gap: 28,
    header: "",
    footer: "",
    enabled: false,
  }),
  addProseMirrorPlugins() {
    const options = this.options;
    if (!options.enabled) return [];
    return [
      new Plugin<PaginationState>({
        key: paginationKey,
        state: {
          init: () => ({ breaks: [], tail: 0, pages: 1, decorations: DecorationSet.empty }),
          apply(tr, value) {
            const next = tr.getMeta(paginationKey) as PaginationState | undefined;
            if (next) return next;
            return tr.docChanged
              ? { ...value, decorations: value.decorations.map(tr.mapping, tr.doc) }
              : value;
          },
        },
        props: {
          decorations: (state) => paginationKey.getState(state)?.decorations,
        },
        view(view) {
          let frame = 0;
          const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              if (!view.dom.isConnected) return;
              const current = paginationKey.getState(view.state);
              const { breaks, tail, pages } = measure(view, options);
              if (
                current &&
                same(current.breaks, breaks) &&
                Math.abs(current.tail - tail) < 1 &&
                current.pages === pages
              ) {
                return;
              }
              view.dispatch(
                view.state.tr
                  .setMeta(paginationKey, {
                    breaks,
                    tail,
                    pages,
                    decorations: decorationsFor(view, breaks, tail, options),
                  } satisfies PaginationState)
                  .setMeta("addToHistory", false),
              );
            });
          };
          const observer = new ResizeObserver(update);
          observer.observe(view.dom);
          update();
          return {
            update: (v, prev) => {
              if (!v.state.doc.eq(prev.doc)) update();
            },
            destroy: () => {
              cancelAnimationFrame(frame);
              observer.disconnect();
            },
          };
        },
      }),
    ];
  },
});
