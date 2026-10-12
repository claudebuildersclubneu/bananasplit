"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { ContinuePill, StepFooter } from "@/components/onboarding/setup-shell";
import {
  nextProfileStep,
  previousProfileStep,
  profileStepHref,
  type ProfileStep,
} from "@/lib/onboarding/steps";

import type { StepSaveResult } from "./actions";

/**
 * Back + Continue for a profile-setup step. Continue saves the step first
 * and only moves on when the save worked; field errors come back to the
 * form through onErrors.
 */
export function useStepSave(step: ProfileStep) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function saveAndContinue(run: () => Promise<StepSaveResult>) {
    setErrors({});
    startTransition(async () => {
      const result = await run();
      if (!result.ok) {
        setErrors(result.fieldErrors);
        return;
      }
      const next = nextProfileStep(step);
      router.push(next ? profileStepHref(next) : "/onboarding");
    });
  }

  return { pending, errors, setErrors, saveAndContinue };
}

export function StepNav({
  step,
  pending,
  onContinue,
  continueLabel = "Continue",
  continueStyle,
  disabled,
}: {
  step: ProfileStep;
  pending: boolean;
  onContinue: () => void;
  continueLabel?: ReactNode;
  /** A4 colours its button with the picked theme. */
  continueStyle?: React.CSSProperties;
  disabled?: boolean;
}) {
  const previous = previousProfileStep(step);
  return (
    <StepFooter back={previous ? { href: profileStepHref(previous) } : undefined}>
      <ContinuePill
        pending={pending}
        onClick={onContinue}
        disabled={disabled}
        style={continueStyle}
      >
        {continueLabel}
      </ContinuePill>
    </StepFooter>
  );
}
