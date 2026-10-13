// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  NOTE_BODY_MAX_BYTES,
  NOTE_JSON_MAX_CHARS,
  NOTE_TEXT_MAX_CHARS,
  noteBodyTooBig,
} from "./limits";

/**
 * The note size check the browser runs before saving: it must say "too big"
 * for anything the Server Action limit in next.config.ts would refuse, and
 * nothing smaller than the limits the actions themselves enforce.
 */
describe("noteBodyTooBig", () => {
  it("lets ordinary notes through", () => {
    expect(noteBodyTooBig(JSON.stringify({ type: "doc", content: [] }), "hello")).toBe(false);
  });

  it("lets a body at the character limits through when it fits the request", () => {
    expect(noteBodyTooBig("x".repeat(NOTE_JSON_MAX_CHARS), "y".repeat(NOTE_TEXT_MAX_CHARS))).toBe(
      false,
    );
  });

  it("stops a body over either character limit", () => {
    expect(noteBodyTooBig("x".repeat(NOTE_JSON_MAX_CHARS + 1), "")).toBe(true);
    expect(noteBodyTooBig("{}", "y".repeat(NOTE_TEXT_MAX_CHARS + 1))).toBe(true);
  });

  it("counts encoded bytes, not characters: escapes and non-Latin text take more room", () => {
    // Every quote travels as \" (2 bytes); every CJK character as 3 bytes.
    expect(noteBodyTooBig('"'.repeat(1_500_000), "")).toBe(true);
    expect(noteBodyTooBig("文".repeat(1_000_000), "")).toBe(true);
    expect(noteBodyTooBig("文".repeat(900_000), "")).toBe(false);
  });

  it("stays under the Server Action body limit configured in next.config.ts", () => {
    const config = readFileSync(path.resolve(__dirname, "../../../../../next.config.ts"), "utf8");
    const mb = Number(/bodySizeLimit:\s*"(\d+)mb"/.exec(config)?.[1]);
    expect(mb).toBeGreaterThan(0);
    expect(NOTE_BODY_MAX_BYTES).toBeLessThan(mb * 1024 * 1024);
  });
});
