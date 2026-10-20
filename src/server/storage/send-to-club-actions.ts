"use server";

import { NotFoundError } from "@/lib/auth/errors";

import { sendFileToClub, sendNoteToClub, type SendResult } from "./send-to-club";

/**
 * Server actions for "Send to a club" (./send-to-club.ts), for the Notes
 * library's item menu in a Personal space:
 *
 *   const result = await sendToClub("file", personalId, fileId, clubId);
 *   if (!result.ok) toast({ title: result.error, tone: "error" });
 */
export async function sendToClub(
  what: "note" | "file",
  personalId: string,
  itemId: string,
  clubId: string,
): Promise<SendResult> {
  try {
    return what === "file"
      ? await sendFileToClub(personalId, itemId, clubId)
      : await sendNoteToClub(personalId, itemId, clubId);
  } catch (error) {
    if (error instanceof NotFoundError) return { ok: false, error: "Not found." };
    throw error;
  }
}
