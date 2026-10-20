"use client";

import { useRef, useState } from "react";

import { UserAvatar } from "@/components/user-avatar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface MentionablePerson {
  id: string;
  name: string | null;
  image?: string | null;
}

/**
 * A comment box with @mentions: type "@" and a few letters, pick a member,
 * and "@Name" goes in the text while their id is remembered, so the
 * comment can tell them (only names still in the text count).
 */
export function MentionTextarea({
  value,
  onChange,
  people,
  onSubmit,
  placeholder,
  label,
  autoFocus,
  mentionsRef,
}: {
  value: string;
  onChange: (value: string) => void;
  people: MentionablePerson[];
  onSubmit: () => void;
  placeholder: string;
  label: string;
  autoFocus?: boolean;
  /** Filled with name → id for every person picked. */
  mentionsRef: React.RefObject<Map<string, string>>;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);

  const matches =
    query === null
      ? []
      : people
          .filter((p) => (p.name ?? "").toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6);

  function readQuery(text: string, caret: number) {
    const before = text.slice(0, caret);
    const m = /(^|\s)@([\p{L}\p{N}._-]{0,30})$/u.exec(before);
    setQuery(m ? m[2]! : null);
    setSelected(0);
  }

  function pick(person: MentionablePerson) {
    const el = ref.current;
    if (!el || !person.name) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@[\p{L}\p{N}._-]{0,30}$/u, "");
    const insert = `@${person.name} `;
    const next = before + insert + value.slice(caret);
    mentionsRef.current.set(person.name, person.id);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      const at = before.length + insert.length;
      el.setSelectionRange(at, at);
    });
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        aria-label={label}
        placeholder={placeholder}
        rows={2}
        maxLength={5000}
        onChange={(e) => {
          onChange(e.target.value);
          readQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (matches.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((i) => (i + 1) % matches.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((i) => (i - 1 + matches.length) % matches.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              pick(matches[selected]!);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setQuery(null);
              return;
            }
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        className="min-h-16 resize-none text-sm"
      />
      {matches.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mention someone"
          className="bg-popover shadow-e2 rounded-tile absolute inset-x-0 top-full z-30 mt-1 border p-1"
        >
          {matches.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === selected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className={cn(
                  "flex h-9 w-full items-center gap-2 rounded-xl px-2 text-left text-sm",
                  i === selected ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <UserAvatar user={p} size="xs" />
                <span className="truncate">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The ids of the people picked whose "@Name" is still in `text`. */
export function mentionedIds(text: string, picked: Map<string, string>): string[] {
  return [...picked.entries()].filter(([name]) => text.includes(`@${name}`)).map(([, id]) => id);
}
