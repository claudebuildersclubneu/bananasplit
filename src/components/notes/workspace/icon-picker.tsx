"use client";

import { SmilePlus } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** A page's icon (Note.icon): an emoji, picked from a short set, or none. */
const ICONS = [
  "📄",
  "📝",
  "📌",
  "📅",
  "🗓️",
  "✅",
  "🎯",
  "💡",
  "🚀",
  "🤖",
  "🎉",
  "📣",
  "🏆",
  "📊",
  "💰",
  "🧾",
  "🛠️",
  "📚",
  "🎓",
  "🧪",
  "🌱",
  "🔥",
  "⭐",
  "❤️",
  "🍌",
  "🎨",
  "🎤",
  "🏟️",
  "🤝",
  "🧭",
];

export function IconPicker({
  icon,
  disabled,
  onChange,
}: {
  icon: string | null;
  disabled: boolean;
  onChange: (icon: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  if (disabled && !icon) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={icon ? "Change the page icon" : "Add a page icon"}
          title={icon ? "Change icon" : "Add icon"}
          className={cn(
            "grid shrink-0 place-items-center rounded-2xl transition-colors disabled:cursor-default",
            icon
              ? "hover:bg-muted size-14 text-[40px] leading-none"
              : "text-muted-foreground hover:bg-muted hover:text-foreground size-10",
          )}
        >
          {icon ?? <SmilePlus className="size-5" aria-hidden="true" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="grid grid-cols-8 gap-0.5">
          {ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Use ${emoji}`}
              aria-pressed={icon === emoji}
              onClick={() => {
                onChange(emoji);
                setOpen(false);
              }}
              className="hover:bg-muted aria-pressed:bg-muted grid size-8 place-items-center rounded-lg text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
        {icon && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="text-muted-foreground hover:bg-muted mt-1 h-8 w-full rounded-lg text-sm"
          >
            Remove icon
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
