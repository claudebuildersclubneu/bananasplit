/*
 * Invite code lengths, shared by the server (src/lib/join-code.ts) and the
 * join screen's boxes. Client-safe: no node imports.
 */

/** Invite codes: eight characters in two groups of four, like RPKA-YWSF. */
export const JOIN_CODE_LENGTH = 8;
/** Six-character codes (like ROBO26), issued for a short while; still accepted. */
export const SHORT_JOIN_CODE_LENGTH = 6;
