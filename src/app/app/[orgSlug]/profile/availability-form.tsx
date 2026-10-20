"use client";

import { useState, useTransition } from "react";

import { saveAvailabilityStep } from "@/app/onboarding/profile/actions";
import { AvailabilityEditor } from "@/components/onboarding/availability-editor";
import { Button } from "@/components/ui/button";
import type { Availability } from "@/lib/availability";

import { SettingsCard } from "../settings/settings-card";

/** Profile > When you can't meet: the onboarding A5 editor, editable. */
export function AvailabilityForm({ initial }: { initial: Availability }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setStatus(null);
    start(async () => {
      const result = await saveAvailabilityStep(value);
      setStatus(
        result.ok
          ? { ok: true, text: "Saved." }
          : {
              ok: false,
              text: Object.values(result.fieldErrors)[0] ?? "Couldn't save. Try again.",
            },
      );
    });
  }

  return (
    <SettingsCard
      title="When you can't meet"
      description="Click or drag to block hours in a typical week, or add rules. Teammates see “busy,” never the reason."
      status={
        <span
          aria-live="polite"
          className={status?.ok === false ? "text-destructive" : "text-success"}
        >
          {status?.text}
        </span>
      }
      footer={
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      }
    >
      <div className="max-w-md">
        <AvailabilityEditor value={value} onChange={setValue} />
      </div>
    </SettingsCard>
  );
}
