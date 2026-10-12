import Link from "next/link";

import { AuthCard, AuthHeadline, AuthTitle } from "@/components/brand/auth-card";
import { primaryPillClass } from "@/components/brand/fields";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { peekVerificationToken } from "@/server/email/verification";

import { confirmEmailAction, resendVerificationAction } from "./actions";

/**
 * The link in the sign-up confirmation email. Opening it only shows a
 * "Confirm email" button; the token is consumed by the button's POST, so a
 * mail scanner that prefetches links cannot use it up.
 */
export const dynamic = "force-dynamic";

const RESULTS = {
  ok: {
    title: "Email confirmed.",
    description: "Thanks. Your email address is confirmed.",
  },
  expired: {
    title: "This link has expired.",
    description: "Confirmation links last 24 hours. Log in and ask for a new one below.",
  },
  invalid: {
    title: "This link doesn't work.",
    description:
      "It may have been used already. If your email isn't confirmed yet, ask for a new link.",
  },
  resent: {
    title: "Check your inbox.",
    description: "We sent a new confirmation link. It may take a minute to arrive.",
  },
  limited: {
    title: "Too many requests.",
    description: "You've asked for several links recently. Try again in an hour.",
  },
} as const;

type Result = keyof typeof RESULTS;

function isResult(value: unknown): value is Result {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RESULTS, value);
}

/** The outline pill under the main action (Send a new link). */
const secondaryPillClass =
  "border-ink/16 bg-paper hover:bg-cream inline-flex h-[50px] w-full cursor-pointer items-center justify-center rounded-full border text-[15px] font-semibold transition-colors";

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <AuthCard panel={<AuthHeadline>Running your club shouldn&apos;t be bananas.</AuthHeadline>}>
      <AuthTitle title={title} description={description} />
      {children}
    </AuthCard>
  );
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: PageProps<"/verify-email/[token]">) {
  const { token } = await params;
  const { result } = await searchParams;
  const session = await getSession();

  const continueLink = (
    <Link href={session ? "/app" : "/sign-in"} className={cn(primaryPillClass, "w-full")}>
      {session ? "Continue" : "Log in"}
    </Link>
  );
  const resendButton = session ? (
    <form action={resendVerificationAction.bind(null, token)}>
      <button type="submit" className={secondaryPillClass}>
        Send a new link
      </button>
    </form>
  ) : null;

  if (isResult(result)) {
    const copy = RESULTS[result];
    return (
      <Shell title={copy.title} description={copy.description}>
        {(result === "expired" || result === "invalid") && resendButton}
        {continueLink}
      </Shell>
    );
  }

  const state = await peekVerificationToken(token);
  if (state !== "valid") {
    const copy = RESULTS[state];
    return (
      <Shell title={copy.title} description={copy.description}>
        {resendButton}
        {continueLink}
      </Shell>
    );
  }

  return (
    <Shell
      title="Confirm your email."
      description="Confirm this address to finish setting up your Bananasplit account."
    >
      <form action={confirmEmailAction.bind(null, token)}>
        <button type="submit" className={cn(primaryPillClass, "w-full")}>
          Confirm email
        </button>
      </form>
    </Shell>
  );
}
