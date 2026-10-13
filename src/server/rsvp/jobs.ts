import { appUrl } from "@/lib/app-url";
import { formatCents, payLinks, shareCents } from "@/lib/rsvp/pay";
import { parsePayTo } from "@/lib/rsvp/pay-schema";
import { startTime, whenLine } from "@/lib/rsvp/when";
import { safeTimeZone } from "@/lib/calendar/dates";
import { withSystemOrgTx } from "@/server/db/context";
import { getOrgMailer, platformFallbackMailer } from "@/server/email/mailer";
import { PermanentJobError, type JobHandler, type JobOutcome } from "@/server/jobs/types";
import { sendSms, SmsSendError, smsDelivery } from "@/server/sms";

import { guestPlace, rsvpEmail, rsvpText } from "./email";
import { enqueueRsvpEmails, registrationCounts, type RsvpEmailTemplate } from "./service";
import { rsvpManageKey } from "./token";

/**
 * The RSVP jobs (registry rows rsvp-email and rsvp-fanout). Same contract
 * as the other email jobs: short service transactions to read and to mark,
 * the sends with no transaction open.
 */

function requireOrg(orgId: string | null): string {
  if (!orgId) throw new PermanentJobError("org job without an organizationId");
  return orgId;
}

const sameInstant = (a: Date, iso: string | undefined) => !iso || a.getTime() === Date.parse(iso);

/**
 * rsvp-fanout:{eventId}:{stage}[...]: one rsvp-email per guest, queued in
 * bulk (enqueueRsvpEmails), not a round trip each. "day" and "hour" remind
 * everyone going (not yet reminded); "cancelled" tells everyone still
 * signed up that the deleted event is off.
 */
export const rsvpFanoutJob: JobHandler<{
  eventId: string;
  stage: "day" | "hour" | "cancelled";
  startsAt?: string;
}> = async (run) => {
  const orgId = requireOrg(run.organizationId);
  const { eventId, stage, startsAt } = run.payload;
  const queued = await withSystemOrgTx(orgId, async ({ db }) => {
    const event = await db.event.findFirst({
      where: { id: eventId, organizationId: orgId },
      select: { startsAt: true, allDay: true, deletedAt: true, rsvpEnabled: true },
    });
    if (stage === "cancelled") {
      if (!event?.deletedAt) return 0;
      const signedUp = await db.eventRegistration.findMany({
        where: { organizationId: orgId, eventId, status: { in: ["GOING", "WAITLIST"] } },
        select: { id: true },
      });
      return enqueueRsvpEmails(
        db,
        orgId,
        signedUp.map((r) => r.id),
        "event-cancelled",
      );
    }
    // Moved (a newer job has the new time), deleted, the page turned off,
    // already started (a drain that ran late), or an all-day event's hour
    // reminder (queued before it became all-day).
    if (
      !event ||
      event.deletedAt ||
      !event.rsvpEnabled ||
      !sameInstant(event.startsAt, startsAt) ||
      event.startsAt <= new Date() ||
      (stage === "hour" && event.allDay)
    ) {
      return 0;
    }
    const going = await db.eventRegistration.findMany({
      where: {
        organizationId: orgId,
        eventId,
        status: "GOING",
        ...(stage === "day" ? { reminderDaySentAt: null } : { reminderHourSentAt: null }),
      },
      select: { id: true },
    });
    return enqueueRsvpEmails(
      db,
      orgId,
      going.map((r) => r.id),
      `reminder-${stage}`,
      { startsAt: event.startsAt },
    );
  });
  if (queued === 0) return { status: "DONE" };
};

/** rsvp-email:{registrationId}:{template}[...]: one email (and, for reminders, a text). */
export const rsvpEmailJob: JobHandler<{
  registrationId: string;
  template: RsvpEmailTemplate;
  startsAt?: string;
}> = async (run): Promise<JobOutcome | void> => {
  const orgId = requireOrg(run.organizationId);
  const { registrationId, template, startsAt } = run.payload;
  const reminderColumn =
    template === "reminder-day"
      ? "reminderDaySentAt"
      : template === "reminder-hour"
        ? "reminderHourSentAt"
        : null;

  const loaded = await withSystemOrgTx(orgId, async ({ db }) => {
    const reg = await db.eventRegistration.findFirst({
      where: { id: registrationId, organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        inviteCode: true,
        ticketCode: true,
        paidClaimedAt: true,
        paidConfirmedAt: true,
        eventId: true,
        event: {
          select: {
            title: true,
            rsvpCostMode: true,
            rsvpCostCents: true,
            rsvpPayTo: true,
            startsAt: true,
            endsAt: true,
            allDay: true,
            location: true,
            locationDetails: true,
            rsvpHideLocation: true,
            conferenceProvider: true,
            conferenceUrl: true,
            deletedAt: true,
            rsvpEnabled: true,
            rsvpSlug: true,
            organization: { select: { name: true, timezone: true } },
          },
        },
      },
    });
    if (!reg || !reg.event.rsvpSlug) return null;
    const e = reg.event;
    // Only what is still true goes out: a guest who has since cancelled, or
    // moved off the waitlist, or an event that moved, gets nothing stale,
    // and a reminder still waiting when the event starts (a retry, a late
    // drain) is dropped rather than sent during or after it.
    const stillTrue =
      template === "event-cancelled"
        ? Boolean(e.deletedAt) && reg.status !== "CANCELLED"
        : !e.deletedAt &&
          (template === "waitlisted" ? reg.status === "WAITLIST" : reg.status === "GOING") &&
          (!reminderColumn ||
            (e.rsvpEnabled &&
              sameInstant(e.startsAt, startsAt) &&
              new Date() < e.startsAt &&
              !(template === "reminder-hour" && e.allDay)));
    if (!stillTrue) return null;
    if (reminderColumn) {
      // Claim it, so a re-run after a lost lease doesn't remind twice.
      const claimed = await db.eventRegistration.updateMany({
        where: { id: reg.id, [reminderColumn]: null },
        data: { [reminderColumn]: new Date() },
      });
      if (claimed.count === 0) return null;
    }
    const { going } = await registrationCounts(db, orgId, reg.eventId);
    return { ...reg, going };
  });
  if (!loaded) return { status: "DONE" };

  const e = loaded.event;
  const tz = safeTimeZone(e.organization.timezone);
  const message = {
    template,
    guestName: loaded.name,
    orgName: e.organization.name,
    title: e.title,
    when: whenLine(e.startsAt, e.endsAt, tz, e.allDay),
    startTime: startTime(e.startsAt, tz),
    // The same rule as the page: the join link only for someone going, and
    // an address the host hides only for someone going too.
    ...guestPlace(
      {
        location: e.location,
        locationDetails: e.locationDetails,
        hideLocation: e.rsvpHideLocation,
        joinUrl: e.conferenceProvider !== "NONE" ? e.conferenceUrl : null,
      },
      loaded.status === "GOING",
    ),
    pageUrl: appUrl(`/e/${e.rsvpSlug}/manage?key=${encodeURIComponent(rsvpManageKey(loaded.id))}`),
    ...guestLinks(loaded, e.rsvpSlug!, template),
  };

  try {
    // The club's own sender, else "<Club> via Bananasplit": a guest's
    // confirmation and reminders go out either way, like invitations.
    const mailer = (await getOrgMailer(orgId)) ?? platformFallbackMailer(e.organization.name);
    await mailer.send({ to: loaded.email, ...rsvpEmail(message) }, { signal: run.signal });
  } catch (error) {
    if (reminderColumn) {
      // Release the claim so the retry sends it.
      await withSystemOrgTx(orgId, ({ db }) =>
        db.eventRegistration.updateMany({
          where: { id: loaded.id },
          data: { [reminderColumn]: null },
        }),
      );
    }
    throw error;
  }

  // The text is best effort: the email already went, and retrying the job
  // for a refused or flaky text would send that email again.
  const text = rsvpText(message);
  if (text && smsDelivery() !== "off") {
    await sendSms(loaded.phone, text, { signal: run.signal }).catch((error: unknown) => {
      const reason = error instanceof SmsSendError ? error.message : "send failed";
      console.warn(`[rsvp] reminder text not sent: ${reason}`);
    });
  }
};

/**
 * The ticket, the invite link and what to chip in, for the emails that go
 * to someone who is going (not the waitlist, not a cancellation).
 */
function guestLinks(
  reg: {
    status: string;
    inviteCode: string;
    ticketCode: string;
    paidClaimedAt: Date | null;
    paidConfirmedAt: Date | null;
    going: number;
    name: string;
    event: {
      title: string;
      rsvpCostMode: "NONE" | "EACH" | "SPLIT";
      rsvpCostCents: number | null;
      rsvpPayTo: unknown;
    };
  },
  slug: string,
  template: RsvpEmailTemplate,
): { ticketUrl: string | null; inviteUrl: string | null; chipIn: string | null } {
  const going = reg.status === "GOING" && template !== "event-cancelled";
  if (!going) return { ticketUrl: null, inviteUrl: null, chipIn: null };
  const share = shareCents(reg.event.rsvpCostMode, reg.event.rsvpCostCents, reg.going);
  const paid = Boolean(reg.paidClaimedAt || reg.paidConfirmedAt);
  let chipIn: string | null = null;
  if (share !== null && !paid) {
    const ways = payLinks(parsePayTo(reg.event.rsvpPayTo), share, reg.event.title)
      .map((l) => `${l.label} ${l.detail ?? ""}`.trim())
      .join(", ");
    chipIn = `${formatCents(share)}${reg.event.rsvpCostMode === "SPLIT" ? " (your share right now)" : ""} to the host${ways ? `: ${ways}` : ""}`;
  }
  return {
    ticketUrl: appUrl(`/e/${slug}/t/${reg.ticketCode}`),
    inviteUrl:
      template === "registered" || template === "promoted"
        ? appUrl(`/e/${slug}?via=${reg.inviteCode}`)
        : null,
    chipIn,
  };
}
