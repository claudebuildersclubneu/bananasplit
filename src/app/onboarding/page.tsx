import Link from "next/link";
import { redirect } from "next/navigation";

import { VerifyEmailNotice } from "@/components/auth/verify-email-notice";
import { ArrowRight } from "@/components/brand/arrows";
import { AuthCard, AuthHeadline, AuthTitle } from "@/components/brand/auth-card";
import { JoinSteps } from "@/components/brand/join-steps";
import { requireUser } from "@/lib/auth/session";
import { withUserTx } from "@/server/db/context";
import { getOnboardingProfile } from "@/server/onboarding/profile";
import { findPendingInvitationsForMe } from "@/server/settings/invitations";

import { PendingInviteCard } from "./pending-invite-card";

export const metadata = { title: "Find your club · Bananasplit" };

/** The two ways on: a 50px row with a title, a line of detail and an arrow. */
const choiceClass =
  "bg-paper border-ink/10 hover:border-ink/30 group flex items-center gap-4 rounded-2xl border px-5 py-4 text-ink transition-colors";

/**
 * /onboarding: where sign-up and sign-in land for someone with no club.
 *
 * The flowchart's first decision, "Profile complete?": no -> profile setup
 * (A1). Yes, with a club -> its home. Yes, without one -> A7: join with a
 * club code or an emailed invite, or start a club (Flow B).
 */
export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getOnboardingProfile(user.id);
  if (!profile) redirect("/auth/session-ended");
  if (!profile.onboardedAt) redirect("/onboarding/profile/basics");
  if (profile.memberships[0]) redirect(`/app/${profile.memberships[0].slug}`);

  // Clubs scheduled for deletion stay reachable at their URL, where an owner
  // can cancel during the 30-day grace period.
  const pendingDeletion = await withUserTx(user.id, ({ db }) =>
    db.membership.findMany({
      where: { userId: user.id, organization: { deletedAt: { not: null } } },
      select: { organization: { select: { name: true, slug: true, deleteScheduledFor: true } } },
    }),
  );
  // Pending invites are listed only for a verified address (0A Fix 4).
  const pendingInvites = profile.emailVerified ? await findPendingInvitationsForMe(user.id) : [];
  const firstName = profile.name?.split(" ")[0];

  return (
    <AuthCard
      panel={
        <div className="flex flex-col gap-6">
          <AuthHeadline />
          <JoinSteps current={2} />
        </div>
      }
    >
      <AuthTitle
        title={firstName ? `Welcome, ${firstName}.` : "Welcome."}
        description="Your profile is set. Now find your club, or start one."
      />

      {!profile.emailVerified && (
        <VerifyEmailNotice email={profile.email} action="join a club or start one" />
      )}

      {pendingInvites.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[14px] font-semibold">Email invites for {profile.email}</h2>
          {pendingInvites.map((invitation) => (
            <PendingInviteCard
              key={invitation.id}
              invitation={{
                id: invitation.id,
                role: invitation.role,
                orgName: invitation.orgName,
              }}
            />
          ))}
        </section>
      )}

      {profile.emailVerified && (
        <div className="flex flex-col gap-2.5">
          <Link href="/onboarding/join" className={choiceClass}>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[16px] font-bold">Join with a club code</span>
              <span className="text-ink-soft text-[14px]">
                An officer shared a code or a link with you.
              </span>
            </span>
            <ArrowRight className="text-ink-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/onboarding/organization" className={choiceClass}>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[16px] font-bold">Start a new club</span>
              <span className="text-ink-soft text-[14px]">
                Set up a workspace for your club. You&apos;ll be its admin.
              </span>
            </span>
            <ArrowRight className="text-ink-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}

      {pendingDeletion.length > 0 && (
        <section className="border-ink/10 flex flex-col gap-2 border-t pt-4">
          <h2 className="m-0 text-[13px] font-semibold">Scheduled for deletion</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {pendingDeletion.map(({ organization: org }) => (
              <li
                key={org.slug}
                className="border-ink/10 flex items-center justify-between rounded-xl border px-4 py-3 text-[14px]"
              >
                <span>
                  <span className="font-semibold">{org.name}</span>
                  {org.deleteScheduledFor && (
                    <span className="text-ink-soft">
                      {" "}
                      · deleted on{" "}
                      {org.deleteScheduledFor.toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </span>
                  )}
                </span>
                <Link href={`/app/${org.slug}`} className="font-semibold underline">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/onboarding/profile/review"
        className="text-ink-muted w-fit self-center text-[14px] font-semibold"
      >
        Review your profile
      </Link>
    </AuthCard>
  );
}
