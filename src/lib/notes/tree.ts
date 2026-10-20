/**
 * Nested pages (Note.parentId): the sidebar tree, breadcrumbs and which
 * moves are allowed, from the flat list of notes the viewer can see. A note
 * whose parent the viewer can't see (or that is in the trash) sits at the
 * top level for them. The database refuses loops on its own
 * (app.note_cycle_guard); `canNestUnder` says so first in the browser.
 */

export interface TreeNote {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
}

export interface TreeNode<T extends TreeNote = TreeNote> {
  note: T;
  children: TreeNode<T>[];
}

/** The forest, keeping the list's order among siblings. */
export function buildNoteTree<T extends TreeNote>(notes: readonly T[]): TreeNode<T>[] {
  const byId = new Map<string, TreeNode<T>>();
  for (const note of notes) byId.set(note.id, { note, children: [] });
  const roots: TreeNode<T>[] = [];
  for (const node of byId.values()) {
    const parent = node.note.parentId ? byId.get(node.note.parentId) : undefined;
    // A loop can't exist in the database; a stale client list might still
    // hold one, so a node never goes under its own descendant here.
    if (parent && !isAncestor(byId, node.note.id, parent.note.id)) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function isAncestor<T extends TreeNote>(
  byId: Map<string, TreeNode<T>>,
  ancestorId: string,
  id: string,
): boolean {
  const seen = new Set<string>();
  let current: string | null = id;
  while (current && !seen.has(current)) {
    if (current === ancestorId) return true;
    seen.add(current);
    current = byId.get(current)?.note.parentId ?? null;
  }
  return false;
}

/** The pages above `id`, outermost first (the breadcrumbs). */
export function ancestorsOf<T extends TreeNote>(notes: readonly T[], id: string): T[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const chain: T[] = [];
  const seen = new Set<string>([id]);
  let parentId = byId.get(id)?.parentId ?? null;
  while (parentId && !seen.has(parentId)) {
    const parent = byId.get(parentId);
    if (!parent) break;
    chain.unshift(parent);
    seen.add(parentId);
    parentId = parent.parentId;
  }
  return chain;
}

/** Whether `id` may move inside `parentId` (null: the top level): never into itself or its subpages. */
export function canNestUnder(
  notes: readonly TreeNote[],
  id: string,
  parentId: string | null,
): boolean {
  if (parentId === null) return true;
  if (parentId === id) return false;
  return !ancestorsOf(notes, parentId).some((n) => n.id === id);
}
