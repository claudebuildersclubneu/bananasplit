"use server";

import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { isRsvpBackground } from "@/lib/rsvp/backgrounds";
import { registrationSchema } from "@/lib/rsvp/schema";
import { writeOrgAuditLog } from "@/server/audit";
import { withOrgAction, type OrgContext } from "@/server/db/context";
import {
  generateRsvpSlug,
  lockEvent,
  promoteFromWaitlist,
  registerGuest,
  RSVP_RULES_SELECT,
  scheduleRsvpReminders,
  setRegistrationStatus,
} from "@/server/rsvp/service";

import { actionError } from "../../action-result";

/**
 * An event's public RSVP page, run from the suite (owners and admins:
 * events.write; RLS also limits sign-ups to them). Each action returns
 * { error } rather than throwing, like the other calendar actions.
 */

export interface RsvpActionResult {
  error?: string;
  slug?: string;
}

async function loadEvent(ctx: OrgContext, eventId: string) {
  const event = await ctx.db.event.findFirst({
    where: { id: eventId, organizationId: ctx.organizationId, deletedAt: null },
    select: RSVP_RULES_SELECT,
  });
  if (!event) throw new NotFound();
  return event;
}

class NotFound extends Error {}

function run<Args extends unknown[]>(
  handler: (ctx: OrgContext, ...args: Args) => Promise<RsvpActionResult>,
) {
  const tx = withOrgAction(async (ctx: OrgContext, ...args: Args) => {
    requirePermission(ctx, "events.write");
    try {
      return await handler(ctx, ...args);
    } catch (error) {
      if (error instanceof NotFound) return { error: "That event no longer exists." };
      throw error;
    }
  });
  return async (organizationId: string, ...args: Args): Promise<RsvpActionResult> => {
    try {
      return await tx(organizationId, ...args);
    } catch (error) {
      return actionError(error);
    }
  };
}

/** Turns the page on, giving the event its link the first time. */
export const turnOnRsvpPage = run(async (ctx, eventId: string) => {
  const event = await loadEvent(ctx, eventId);
  let slug = event.rsvpSlug;
  for (let attempt = 0; !slug; attempt++) {
    const candidate = generateRsvpSlug();
    // A savepoint, so a code another club already has (1 in 10^12) doesn't
    // abort the whole transaction.
    await ctx.db.$executeRaw`SAVEPOINT rsvp_slug`;
    try {
      await ctx.db.event.update({ where: { id: event.id }, data: { rsvpSlug: candidate } });
      await ctx.db.$executeRaw`RELEASE SAVEPOINT rsvp_slug`;
      slug = candidate;
    } catch (error) {
      await ctx.db.$executeRaw`ROLLBACK TO SAVEPOINT rsvp_slug`;
      const taken = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!taken || attempt >= 4) throw error;
    }
  }
  const updated = await ctx.db.event.update({
    where: { id: event.id },
    data: { rsvpEnabled: true },
    select: { id: true, organizationId: true, startsAt: true, rsvpEnabled: true },
  });
  await scheduleRsvpReminders(ctx.db, updated);
  await writeOrgAuditLog(ctx.db, {
    organizationId: ctx.organizationId,
    action: "event.rsvp_page_on",
    targetType: "Event",
    targetId: event.id,
  });
  return { slug };
});

/** Turns the page off: its link stops working; sign-ups are kept. */
export const turnOffRsvpPage = run(async (ctx, eventId: string) => {
  const event = await loadEvent(ctx, eventId);
  await ctx.db.event.update({ where: { id: event.id }, data: { rsvpEnabled: false } });
  await writeOrgAuditLog(ctx.db, {
    organizationId: ctx.organizationId,
    action: "event.rsvp_page_off",
    targetType: "Event",
    targetId: event.id,
  });
  return {};
});

const settingsSchema = z.object({
  locationDetails: z
    .string()
    .trim()
    .max(1000, "Keep the directions under 1,000 characters.")
    .nullable(),
  capacity: z.number().int().min(1, "Allow at least one spot.").max(100_000).nullable(),
  waitlist: z.boolean(),
  closed: z.boolean(),
  hideLocation: z.boolean(),
  hideGuests: z.boolean(),
  hideCount: z.boolean(),
  background: z.string().refine(isRsvpBackground, "Pick one of the backgrounds."),
});

export type RsvpSettingsInput = z.input<typeof settingsSchema>;

/** The page's settings. More spots (or none to limit) moves waitlisted guests up. */
export const saveRsvpSettings = run(async (ctx, eventId: string, input: unknown) => {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the settings." };
  const s = parsed.data;
  const event = await loadEvent(ctx, eventId);
  await lockEvent(ctx.db, event.id);
  const updated = await ctx.db.event.update({
    where: { id: event.id },
    data: {
      locationDetails: s.locationDetails || null,
      rsvpCapacity: s.capacity,
      rsvpWaitlist: s.waitlist,
      rsvpClosed: s.closed,
      rsvpHideLocation: s.hideLocation,
      rsvpHideGuests: s.hideGuests,
      rsvpHideCount: s.hideCount,
      rsvpBackground: s.background,
    },
    select: RSVP_RULES_SELECT,
  });
  await promoteFromWaitlist(ctx.db, updated);
  return {};
});

const statusSchema = z.enum(["GOING", "WAITLIST", "CANCELLED"]);

/** Moves a guest (to going even past capacity, to the waitlist, or out). */
export const setGuestStatus = run(
  async (ctx, eventId: string, registrationId: string, status: unknown) => {
    const parsed = statusSchema.safeParse(status);
    if (!parsed.success) return { error: "Pick going, waitlist or cancelled." };
    const event = await loadEvent(ctx, eventId);
    const ok = await setRegistrationStatus(ctx.db, event, registrationId, parsed.data);
    return ok ? {} : { error: "That guest isn't signed up anymore." };
  },
);

/** Checks a guest in at the door, or undoes it. */
export const setGuestCheckedIn = run(
  async (ctx, eventId: string, registrationId: string, checkedIn: unknown) => {
    const event = await loadEvent(ctx, eventId);
    const done = await ctx.db.eventRegistration.updateMany({
      where: { id: registrationId, organizationId: ctx.organizationId, eventId: event.id },
      data: { checkedInAt: checkedIn === true ? new Date() : null },
    });
    return done.count ? {} : { error: "That guest isn't signed up anymore." };
  },
);

/** Adds someone by hand: always going, even past capacity. */
export const addGuest = run(async (ctx, eventId: string, input: unknown) => {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Check the guest's details." };
  const event = await loadEvent(ctx, eventId);
  if (!event.rsvpEnabled) return { error: "Turn on the RSVP page first." };
  const outcome = await registerGuest(ctx.db, event, parsed.data, { force: true });
  if (outcome.kind === "exists") return { error: "That email is already on the list." };
  if (outcome.kind === "closed") return { error: "This page isn't taking sign-ups." };
  return {};
});

/** Removes a sign-up for good (a test, a duplicate); a freed spot moves the waitlist up. */
export const deleteGuest = run(async (ctx, eventId: string, registrationId: string) => {
  const event = await loadEvent(ctx, eventId);
  await lockEvent(ctx.db, event.id);
  const gone = await ctx.db.eventRegistration.deleteMany({
    where: { id: registrationId, organizationId: ctx.organizationId, eventId: event.id },
  });
  if (gone.count) await promoteFromWaitlist(ctx.db, event);
  return {};
});
