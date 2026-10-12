import Link from "next/link";

import { AuthCard, AuthTitle } from "@/components/brand/auth-card";
import { pill } from "@/components/brand/pill";
import { CONTACT_HREF } from "@/lib/brand/links";
import { googleSignInEnabled } from "@/lib/auth/google-sign-in";
import { cn } from "@/lib/utils";

export const metadata = { title: "Forgot your password · Bananasplit" };

/**
 * Where the log-in form's "Forgot?" goes. There is no emailed password
 * reset yet, so this says so plainly and points at the ways back in.
 */
export default function ForgotPasswordPage() {
  const googleEnabled = googleSignInEnabled();
  return (
    <AuthCard>
      <AuthTitle
        title="Forgot your password?"
        description="We can't reset passwords by email yet."
      />
      <ul className="text-ink-muted m-0 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-normal">
        {googleEnabled && <li>If you signed up with Google, log in with Google instead.</li>}
        <li>
          Otherwise,{" "}
          <a href={CONTACT_HREF} className="font-semibold underline">
            contact us
          </a>{" "}
          from your account&apos;s email and we&apos;ll help you back in.
        </li>
      </ul>
      <Link href="/sign-in" className={cn(pill({ raised: true }), "w-full")}>
        Back to log in
      </Link>
    </AuthCard>
  );
}
