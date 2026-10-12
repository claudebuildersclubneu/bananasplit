import { AuthCard } from "@/components/brand/auth-card";
import { googleSignInEnabled } from "@/lib/auth/google-sign-in";
import { PASSWORD_RESET_TTL_MINUTES } from "@/server/email/password-reset";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Reset your password · Bananasplit" };

/** Where the log-in form's "Forgot?" goes: ask for an emailed reset link. */
export default function ForgotPasswordPage() {
  return (
    <AuthCard>
      <ForgotPasswordForm
        expiresMinutes={PASSWORD_RESET_TTL_MINUTES}
        googleEnabled={googleSignInEnabled()}
      />
    </AuthCard>
  );
}
