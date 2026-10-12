/*
 * Club code lengths, shared by the server (src/lib/join-code.ts) and the
 * six-box join screen. Client-safe: no node imports.
 */

/** New codes: six characters, like ROBO26. */
export const JOIN_CODE_LENGTH = 6;
/** The earlier XXXX-XXXX format, still accepted for codes already shared. */
export const LEGACY_JOIN_CODE_LENGTH = 8;
