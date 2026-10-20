"use client";

import { useEffect, useState } from "react";

import { searchContactsAction } from "@/app/app/[orgSlug]/databases/actions";
import { SearchField } from "@/components/ui/search-field";

export interface ContactOption {
  id: string;
  displayName: string | null;
  emailMasked: string | null;
  sessionsAttended: number;
  userId: string | null;
}

/** Type-ahead over the org's contacts (server search, RLS applies). */
export function ContactSearch({
  organizationId,
  onPick,
  excludeId,
  placeholder = "Search by name or email…",
}: {
  organizationId: string;
  onPick: (contact: ContactOption) => void;
  excludeId?: string;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ContactOption[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const timer = setTimeout(async () => {
      const r = await searchContactsAction(organizationId, q);
      setResults((r.data ?? []).filter((c) => c.id !== excludeId));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, organizationId, excludeId]);

  return (
    <div className="space-y-1">
      <SearchField
        value={q}
        onValueChange={setQ}
        placeholder={placeholder}
        aria-label="Search people"
        className="sm:w-full"
      />
      {q.trim().length >= 2 && results.length > 0 && (
        <ul className="bg-popover ring-foreground/6 rounded-tile shadow-e2 max-h-48 overflow-y-auto p-1.5 text-sm ring-1">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="hover:bg-muted rounded-field flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
                onClick={() => {
                  onPick(c);
                  setQ("");
                  setResults([]);
                }}
              >
                <span>
                  {c.displayName ?? "Unnamed"}{" "}
                  <span className="text-muted-foreground text-xs">{c.emailMasked}</span>
                </span>
                <span className="text-muted-foreground text-xs">{c.sessionsAttended} sessions</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
