"use client";

import { useRef } from "react";

import { LEGACY_JOIN_CODE_LENGTH } from "@/lib/join-code-format";
import { cn } from "@/lib/utils";

/** Letters and digits only, upper-cased. */
export function cleanCode(text: string): string {
  return text.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

/**
 * One box per character of a club code (design: App screens, 03). Accepts
 * A-Z and 0-9 only and upper-cases them; typing moves on to the next box;
 * Backspace in an empty box clears the one before and moves back; the arrow
 * keys move between boxes; focusing a box selects it; a paste anywhere fills
 * the boxes from the start. `value` has one entry per box ("" when empty);
 * a pasted legacy XXXX-XXXX code comes back as eight entries, and the
 * boxes follow the array's length.
 */
export function CodeBoxes({
  value,
  onChange,
  invalid = false,
  autoFocus = false,
  label = "Club code",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
  autoFocus?: boolean;
  label?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const length = value.length;

  // Right away, not after the re-render: a fast typist's (or autofill's)
  // next key must already land in the next box.
  function focus(i: number) {
    refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();
  }

  function onPaste(e: React.ClipboardEvent) {
    const text = cleanCode(e.clipboardData.getData("text"));
    if (!text) return;
    e.preventDefault();
    const size =
      text.length === LEGACY_JOIN_CODE_LENGTH && length < LEGACY_JOIN_CODE_LENGTH
        ? LEGACY_JOIN_CODE_LENGTH
        : length;
    const next = Array.from({ length: size }, (_, k) => text[k] ?? "");
    onChange(next);
    setTimeout(() => refs.current[Math.min(size - 1, text.length)]?.focus(), 0);
  }

  return (
    <div
      role="group"
      aria-label={label}
      onPaste={onPaste}
      className={cn("flex gap-2.5", length > 6 && "gap-2")}
    >
      {value.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={char}
          aria-label={`${label} character ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          autoComplete="one-time-code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          autoFocus={autoFocus && i === 0}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const chars = cleanCode(e.target.value);
            const next = [...value];
            if (!chars) {
              next[i] = "";
              onChange(next);
              return;
            }
            let j = i;
            for (const ch of chars.slice(-(length - i))) {
              if (j > length - 1) break;
              next[j++] = ch;
            }
            onChange(next);
            focus(j);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) {
              e.preventDefault();
              const next = [...value];
              next[i - 1] = "";
              onChange(next);
              focus(i - 1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              refs.current[Math.max(0, i - 1)]?.focus();
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              refs.current[Math.min(length - 1, i + 1)]?.focus();
            }
          }}
          className={cn(
            "font-display focus-banana caret-ripe h-[68px] max-w-[58px] min-w-0 flex-1 basis-0 rounded-[14px] border-[1.5px] text-center text-[30px] uppercase transition-[border-color,box-shadow,background-color] outline-none",
            length > 6 && "max-w-[46px] text-[26px]",
            char ? "border-ink bg-paper" : "border-ink/16 bg-cream",
            invalid && "border-destructive",
          )}
        />
      ))}
    </div>
  );
}
