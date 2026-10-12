import { randomInt } from "node:crypto";

import { JOIN_CODE_LENGTH, SHORT_JOIN_CODE_LENGTH } from "./join-code-format";

/**
 * Org invite codes (OrgJoinCode.code): eight characters in two groups of
 * four, like RPKA-YWSF, from a 30-letter alphabet with no 0/O, 1/I/L or U,
 * about 6.6e11 codes. They are looked up only by signed-in, verified users
 * and rate limited per user. The six-character codes (like ROBO26) issued
 * for a short while keep working until an admin makes a new one.
 */

export { JOIN_CODE_LENGTH, SHORT_JOIN_CODE_LENGTH };

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

export const JOIN_CODE_RE = /^(?:[A-Z0-9]{6}|[A-Z0-9]{4}-[A-Z0-9]{4})$/;

/** A new code, "RPKA-YWSF". */
export function generateJoinCode(): string {
  let out = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

/**
 * " rpka ywsf " -> "RPKA-YWSF"; " robo26 " -> "ROBO26" (a short code); null
 * when it can't be a code.
 */
export function normalizeJoinCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length === JOIN_CODE_LENGTH) return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  if (raw.length === SHORT_JOIN_CODE_LENGTH) return raw;
  return null;
}

/** "@Northeastern.edu " -> "northeastern.edu"; null when blank or not a domain. */
export function normalizeDomain(input: string | null | undefined): string | null {
  const d = (input ?? "").trim().toLowerCase().replace(/^@/, "");
  if (!d) return null;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d) ? d : null;
}

/** Whether `email` is on `domain` or one of its subdomains. */
export function emailOnDomain(email: string, domain: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const host = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}
