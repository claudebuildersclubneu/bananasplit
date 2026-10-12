"use client";

import { Lock, Users } from "lucide-react";

import { segmentedItem, segmentedTrack } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "PRIVATE" as const, label: "Only me", icon: Lock },
  { value: "ORGANIZATION" as const, label: "Everyone in the club", icon: Users },
];

/** Who can see a note: the app's segmented switch, which can be read-only. */
export function VisibilityToggle({
  value,
  onChange,
  disabled,
}: {
  value: "PRIVATE" | "ORGANIZATION";
  onChange: (value: "PRIVATE" | "ORGANIZATION") => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="Who can see it" className={segmentedTrack}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            segmentedItem(value === option.value),
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <option.icon aria-hidden="true" />
          {option.label}
        </button>
      ))}
    </div>
  );
}
