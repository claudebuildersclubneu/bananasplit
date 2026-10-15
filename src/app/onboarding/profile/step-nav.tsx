"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { ContinuePill, StepFooter } from "@/components/onboarding/setup-shell";
import {
  FIRST_PROFILE_STEP,
  nextProfileStep,
  previousProfileStep,
  profileStepHref,
  type ProfileStep,
} from "@/lib/onboarding/steps";

import type { StepSaveResult } from "./actions";

/**
 * Where a step goes once it's done (saved or skipped). Step 1 goes back to
 * `after` (a safe callbackUrl: where sign-up started, like an invite link)
 * when there is one; the rest of the profile waits on the dashboard's
 * "Finish your profile". Otherwise on to the next step.
 */
function nextHref(step: ProfileStep, after?: string | null): string {
  if (step === FIRST_PROFILE_STEP && after) return after;
  const next = nextProfileStep(step);
  return next ? profileStepHref(next) : "/onboarding";
}

/**
 * Continue for a profile step: saves the step first and only moves on when
 * the save worked; field errors come back to the form through onErrors.
 */
export function useStepSave(step: ProfileStep, after?: string | null) {
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
      router.push(nextHref(step, after));
    });
  }

  return { pending, errors, setErrors, saveAndContinue };
}

/**
 * Back, Skip and Continue for a profile step. Every step after the first
 * shows Skip: it moves on without saving anything.
 */
export function StepNav({
  step,
  pending,
  onContinue,
  continueLabel = "Continue",
  disabled,
}: {
  step: ProfileStep;
  pending: boolean;
  onContinue: () => void;
  continueLabel?: ReactNode;
  disabled?: boolean;
}) {
  const router = useRouter();
  const previous = previousProfileStep(step);
  return (
    <StepFooter
      back={previous ? { href: profileStepHref(previous) } : undefined}
      skip={
        step === FIRST_PROFILE_STEP
          ? undefined
          : { onClick: () => router.push(nextHref(step)), disabled: pending }
      }
    >
      <ContinuePill pending={pending} onClick={onContinue} disabled={disabled}>
        {continueLabel}
      </ContinuePill>
    </StepFooter>
  );
}
