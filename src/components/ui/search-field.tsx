"use client";

import { Search, X } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The one search box every page uses: magnifier on the left, a clear button
 * once there's text, the height and corners of a small button (h-7), so it
 * lines up with the rest of a toolbar.
 * Controlled (`value` + `onValueChange`) or uncontrolled inside a <form>
 * (`name` + `defaultValue`, Enter submits; the x submits the emptied form
 * too, unless `onClear` handles it).
 */
export function SearchField({
  className,
  inputClassName,
  value,
  defaultValue,
  onValueChange,
  onClear,
  hint,
  ref,
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "value" | "defaultValue"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  /** A keyboard hint shown at the right while the box is empty (e.g. "/"). */
  hint?: string;
  inputClassName?: string;
}) {
  const inner = React.useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = React.useState(defaultValue ?? "");
  const current = value ?? draft;

  function setRefs(el: HTMLInputElement | null) {
    inner.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  }

  return (
    <div className={cn("relative w-full sm:w-56", className)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        {...props}
        ref={setRefs}
        type="search"
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(e) => {
          if (value === undefined) setDraft(e.target.value);
          onValueChange?.(e.target.value);
          onChange?.(e);
        }}
        className={cn(
          "h-7 ps-8 pe-8 text-sm [&::-webkit-search-cancel-button]:appearance-none",
          inputClassName,
        )}
      />
      {current ? (
        <button
          type="button"
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-md"
          onClick={() => {
            if (value === undefined) {
              setDraft("");
              if (inner.current) inner.current.value = "";
            }
            onValueChange?.("");
            if (onClear) onClear();
            else if (value === undefined && props.name) inner.current?.form?.requestSubmit();
            inner.current?.focus();
          }}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : hint ? (
        <kbd className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-md border px-1 font-sans text-[10px] leading-4 sm:block">
          {hint}
        </kbd>
      ) : null}
    </div>
  );
}
