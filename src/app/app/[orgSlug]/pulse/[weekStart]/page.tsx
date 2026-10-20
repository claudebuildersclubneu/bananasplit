import { notFound } from "next/navigation";

import { BackLink } from "@/components/back-link";
import { can } from "@/lib/auth/permissions";
import { handleAuthErrorInPage } from "@/lib/auth/handle-auth-error";
import { safeTimeZone } from "@/lib/calendar/dates";
import { pulseRangeOf, pulseTitle } from "@/lib/pulse/data";
import { DEFAULT_PULSE_DAY, DEFAULT_PULSE_HOUR } from "@/lib/pulse/settings";
import { isDateKey } from "@/lib/tasks/dates";
import { planGate } from "@/server/billing/plan-gate";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { loadPulseFinance, seesPulseFinance } from "@/server/pulse/finance";
import { getPulseIssue, nextPulseLabel } from "@/server/pulse/queries";

import { PulseIssueView } from "../issue-view";
import { PulseNoteForm } from "../note-form";

export async function generateMetadata({ params }: PageProps<"/app/[orgSlug]/pulse/[weekStart]">) {
  const { weekStart } = await params;
  return {
    title: isDateKey(weekStart) ? `Weekly pulse: ${pulseTitle(pulseRangeOf(weekStart))}` : "Weekly pulse",
  };
}

/**
 * One week's pulse. Members see it once it went out; owners and admins
 * also see this week's draft, with the note they can add before it sends.
 * Finance roles see "Money moved", worked out now and never stored.
 */
export default async function PulseIssuePage({
  params,
}: PageProps<"/app/[orgSlug]/pulse/[weekStart]">) {
  const { orgSlug, weekStart } = await params;
  if (!isDateKey(weekStart)) notFound();
  const locked = await planGate(orgSlug, "overview", { title: "Weekly pulse" });
  if (locked) return locked;
  const { organization: org, role, settings } = await getOrgContextBySlug(orgSlug);
  if (org.kind === "PERSONAL") notFound();
  const isAdmin = can({ role }, "settings.general.write");
  const tz = safeTimeZone(org.timezone);
  const now = new Date();

  const { issue, finance } = await withOrgTx(org.id, async ({ db }) => {
    const issue = await getPulseIssue(db, org.id, weekStart, { drafts: isAdmin });
    const finance =
      issue && seesPulseFinance(role)
        ? await loadPulseFinance(db, org.id, issue.data.range, tz, now)
        : null;
    return { issue, finance };
  }).catch(handleAuthErrorInPage);
  if (!issue) notFound();

  const sendsAt = nextPulseLabel(
    now,
    tz,
    settings?.pulseDay ?? DEFAULT_PULSE_DAY,
    settings?.pulseHourLocal ?? DEFAULT_PULSE_HOUR,
  );
  const status = issue.sentAt
    ? `Sent ${new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz }).format(issue.sentAt)}`
    : `Draft, goes out ${sendsAt}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/app/${org.slug}/pulse`} label="Weekly pulse" />
      <PulseIssueView
        clubName={org.name}
        data={issue.data}
        note={issue.note}
        finance={finance}
        status={status}
        noteSlot={
          !issue.sentAt && isAdmin ? (
            <div className="bg-muted/60 rounded-tile p-4">
              <PulseNoteForm orgId={org.id} issueId={issue.id} initial={issue.note} sendsAt={sendsAt} />
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
