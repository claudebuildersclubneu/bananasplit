"use server";

import { z } from "zod";

import { withOrgAction } from "@/server/db/context";
import {
  createFolder,
  deleteFolder,
  moveToFolder,
  updateFolder,
  type FolderResult,
} from "@/server/notes/folders";

/** Every action here belongs to files (withOrgAction's space check). */
const filesAction: typeof withOrgAction = (handler, options) =>
  withOrgAction(handler, { onRefused: "return", ...options, feature: "files" });

/** Folders in Files: every write runs as the member, under RLS. */

const id = z.string().min(1).max(64);

export const createFolderAction = filesAction(
  async (ctx, name: unknown, color: unknown): Promise<FolderResult> =>
    createFolder(ctx.db, ctx.organizationId, ctx.userId, name, color),
);

export const updateFolderAction = filesAction(
  async (
    ctx,
    folderId: string,
    patch: { name?: unknown; color?: unknown },
  ): Promise<FolderResult> =>
    updateFolder(ctx.db, ctx.organizationId, id.parse(folderId), patch ?? {}),
);

export const deleteFolderAction = filesAction(
  async (ctx, folderId: string): Promise<FolderResult> =>
    deleteFolder(ctx.db, ctx.organizationId, id.parse(folderId)),
);

export const moveToFolderAction = filesAction(
  async (
    ctx,
    items: { noteIds?: string[]; fileIds?: string[] },
    folderId: string | null,
  ): Promise<FolderResult> => {
    const parsed = z
      .object({
        noteIds: z.array(id).max(100).optional(),
        fileIds: z.array(id).max(100).optional(),
      })
      .safeParse(items);
    if (!parsed.success) return { ok: false, error: "Nothing to move." };
    return moveToFolder(
      ctx.db,
      ctx.organizationId,
      parsed.data,
      folderId ? id.parse(folderId) : null,
    );
  },
);
