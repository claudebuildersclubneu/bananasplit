"use client";

import { useState } from "react";

import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { passwordStrength } from "@/lib/auth/password-strength";
import { cn } from "@/lib/utils";

import { BrandField, BrandInput } from "./fields";

/**
 * A new password (sign-up, password reset): the field and its three-segment
 * strength meter (filled in the text colour, empty in the muted fill), with
 * the label beside it.
 * Posts as `password`.
 */
export function NewPasswordField({
  label = "Password",
  autoFocus = false,
  inputClassName,
}: {
  label?: string;
  autoFocus?: boolean;
  inputClassName?: string;
}) {
  const [password, setPassword] = useState("");
  const strength = passwordStrength(password);
  return (
    <BrandField id="password" label={label}>
      <BrandInput
        id="password"
        name="password"
        type="password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        autoComplete="new-password"
        autoFocus={autoFocus}
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        className={inputClassName}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-describedby="password-strength"
      />
      <span id="password-strength" className="flex items-center gap-1.5" aria-live="polite">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            aria-hidden="true"
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              n <= strength.score ? "bg-foreground" : "bg-muted-strong",
            )}
          />
        ))}
        <span className="text-muted-foreground ml-1.5 min-w-12 text-[12px]">
          {strength.label && <span className="sr-only">Password strength: </span>}
          {strength.label}
        </span>
      </span>
    </BrandField>
  );
}
