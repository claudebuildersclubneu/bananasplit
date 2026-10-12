import { randomInt } from "node:crypto";

import { JOIN_CODE_LENGTH, LEGACY_JOIN_CODE_LENGTH } from "./join-code-format";

/**
 * Org invite codes (OrgJoinCode.code): six characters, like ROBO26, from a
 * 30-letter alphabet with no 0/O, 1/I/L or U, about 7.3e8 codes. They are
 * looked up only by signed-in, verified users and rate limited per user.
 * Codes made before the six-box join screen are XXXX-XXXX and keep working.
 */

export { JOIN_CODE_LENGTH, LEGACY_JOIN_CODE_LENGTH };

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

export const JOIN_CODE_RE = /^(?:[A-Z0-9]{6}|[A-Z0-9]{4}-[A-Z0-9]{4})$/;

export function generateJoinCode(): string {
  let out = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/**
 * " robo26 " -> "ROBO26"; " abcd efgh " -> "ABCD-EFGH" (a legacy code); null
 * when it can't be a code.
 */
export function normalizeJoinCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length === JOIN_CODE_LENGTH) return raw;
  if (raw.length === LEGACY_JOIN_CODE_LENGTH) return `${raw.slice(0, 4)}-${raw.slice(4)}`;
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
