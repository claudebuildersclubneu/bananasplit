import { appUrl } from "@/lib/app-url";
import { startTime, whenLine } from "@/lib/rsvp/when";
import { safeTimeZone } from "@/lib/calendar/dates";
import { withSystemOrgTx } from "@/server/db/context";
import { getOrgMailer, platformFallbackMailer } from "@/server/email/mailer";
import { PermanentJobError, type JobHandler, type JobOutcome } from "@/server/jobs/types";
import { sendSms, SmsSendError, smsDelivery } from "@/server/sms";

import { rsvpEmail, rsvpText } from "./email";
import { enqueueRsvpEmail, type RsvpEmailTemplate } from "./service";
import { rsvpManageKey } from "./token";

/**
 * The RSVP jobs (registry rows rsvp-email and rsvp-reminder). Same contract
 * as the other email jobs: short service transactions to read and to mark,
 * the sends with no transaction open.
 */

function requireOrg(orgId: string | null): string {
  if (!orgId) throw new PermanentJobError("org job without an organizationId");
  return orgId;
}

const sameInstant = (a: Date, iso: string | undefined) => !iso || a.getTime() === Date.parse(iso);

/**
 * rsvp-fanout:{eventId}:{stage}[...]: one rsvp-email per guest. "day" and
 * "hour" remind everyone going (not yet reminded); "cancelled" tells
 * everyone still signed up that the deleted event is off.
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
      select: { startsAt: true, deletedAt: true, rsvpEnabled: true },
    });
    if (stage === "cancelled") {
      if (!event?.deletedAt) return 0;
      const signedUp = await db.eventRegistration.findMany({
        where: { organizationId: orgId, eventId, status: { in: ["GOING", "WAITLIST"] } },
        select: { id: true },
      });
      for (const r of signedUp) await enqueueRsvpEmail(db, orgId, r.id, "event-cancelled");
      return signedUp.length;
    }
    // Moved (a newer job has the new time), deleted, or the page turned off.
    if (!event || event.deletedAt || !event.rsvpEnabled || !sameInstant(event.startsAt, startsAt)) {
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
    for (const r of going) {
      await enqueueRsvpEmail(db, orgId, r.id, `reminder-${stage}`, { startsAt: event.startsAt });
    }
    return going.length;
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
        event: {
          select: {
            title: true,
            startsAt: true,
            endsAt: true,
            allDay: true,
            location: true,
            locationDetails: true,
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
    // moved off the waitlist, or an event that moved, gets nothing stale.
    const stillTrue =
      template === "event-cancelled"
        ? Boolean(e.deletedAt) && reg.status !== "CANCELLED"
        : !e.deletedAt &&
          (template === "waitlisted" ? reg.status === "WAITLIST" : reg.status === "GOING") &&
          (!reminderColumn || (e.rsvpEnabled && sameInstant(e.startsAt, startsAt)));
    if (!stillTrue) return null;
    if (reminderColumn) {
      // Claim it, so a re-run after a lost lease doesn't remind twice.
      const claimed = await db.eventRegistration.updateMany({
        where: { id: reg.id, [reminderColumn]: null },
        data: { [reminderColumn]: new Date() },
      });
      if (claimed.count === 0) return null;
    }
    return reg;
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
    location: e.location,
    locationDetails: e.locationDetails,
    joinUrl: e.conferenceProvider !== "NONE" ? e.conferenceUrl : null,
    pageUrl: appUrl(`/e/${e.rsvpSlug}/manage?key=${encodeURIComponent(rsvpManageKey(loaded.id))}`),
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
