"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ConferenceProvider, EventKind, EventVisibility } from "@/generated/prisma/client";
import { setActiveOrgCookie } from "@/lib/active-org-cookie";
import { requireUser } from "@/lib/auth/session";
import { parseZonedDateTimeLocal, safeTimeZone } from "@/lib/calendar/dates";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { PENDING_SAVE_COOKIE } from "@/lib/rsvp/save-cookie";
import { writeOrgAuditLog } from "@/server/audit";
import { withOrgAction } from "@/server/db/context";
import { createEvent, deleteEvent, updateEvent } from "@/server/events/service";
import { ensurePersonalSpace, getPersonalSpace, movePersonalEvent } from "@/server/rsvp/personal";
import { enableRsvpPage } from "@/server/rsvp/service";

import { actionError } from "../app/[orgSlug]/calendar/action-result";

/**
 * Free RSVP pages (/rsvp): make one without a club, edit or delete it, and
 * "Save to a club". Each runs as the person in their own personal space
 * (withOrgAction on its id: RLS checks they own it), through the same event
 * service and RSVP service a club uses.
 */

export interface FreeEventState {
  error?: string;
  field?: "title" | "startsAt" | "endsAt" | "location" | "conferenceUrl";
  unverified?: boolean;
}

/** Free events a person can make in a day (a page goes out under Bananasplit's name). */
const CREATE_LIMIT = { limit: 20, windowSec: 24 * 60 * 60 };

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const detailsSchema = z.object({
  title: z.string().trim().min(1, "Give your event a name.").max(200, "That name is too long."),
  startsAt: z.string().trim().min(1, "Pick when it starts."),
  endsAt: z.string().trim().min(1, "Pick when it ends."),
  location: z.string().trim().max(300, "Keep the address under 300 characters."),
  conferenceUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || isHttpUrl(v), "Online links start with https://"),
  description: z.string().trim().max(20_000, "That description is too long."),
  timezone: z.string().trim().max(64),
});

type Details = {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  conferenceProvider: ConferenceProvider;
  conferenceUrl: string | null;
};

function readDetails(
  form: FormData,
  timeZone: string,
): { ok: true; details: Details } | { ok: false; state: FreeEventState } {
  const parsed = detailsSchema.safeParse({
    title: form.get("title") ?? "",
    startsAt: form.get("startsAt") ?? "",
    endsAt: form.get("endsAt") ?? "",
    location: form.get("location") ?? "",
    conferenceUrl: form.get("conferenceUrl") ?? "",
    description: form.get("description") ?? "",
    timezone: form.get("timezone") ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    return {
      ok: false,
      state: {
        error: issue?.message ?? "Check the form.",
        field:
          field === "title" ||
          field === "startsAt" ||
          field === "endsAt" ||
          field === "location" ||
          field === "conferenceUrl"
            ? field
            : undefined,
      },
    };
  }
  const d = parsed.data;
  const startsAt = parseZonedDateTimeLocal(d.startsAt, timeZone);
  const endsAt = parseZonedDateTimeLocal(d.endsAt, timeZone);
  if (!startsAt) return { ok: false, state: { error: "Pick when it starts.", field: "startsAt" } };
  if (!endsAt) return { ok: false, state: { error: "Pick when it ends.", field: "endsAt" } };
  if (endsAt <= startsAt) {
    return { ok: false, state: { error: "It has to end after it starts.", field: "endsAt" } };
  }
  return {
    ok: true,
    details: {
      title: d.title,
      description: d.description || null,
      location: d.location || null,
      startsAt,
      endsAt,
      conferenceProvider: d.conferenceUrl ? ConferenceProvider.OTHER : ConferenceProvider.NONE,
      conferenceUrl: d.conferenceUrl || null,
    },
  };
}

const createInSpace = withOrgAction(async (ctx, details: Details) => {
  const { event } = await createEvent(ctx, {
    ...details,
    kind: EventKind.SOCIAL,
    visibility: EventVisibility.INTERNAL,
    hostUserId: ctx.userId,
  });
  await enableRsvpPage(ctx.db, ctx.organizationId, event.id);
  return event.id;
});

/** /rsvp/new: makes the person's space if needed, the event, and its live page. */
export async function createFreeEvent(
  _prev: FreeEventState,
  form: FormData,
): Promise<FreeEventState> {
  const user = await requireUser();
  const browserZone = safeTimeZone(String(form.get("timezone") ?? ""));
  const space = await ensurePersonalSpace(user, browserZone);
  if (!space.ok) return { error: space.error, unverified: space.unverified };
  const read = readDetails(form, space.space.timezone);
  if (!read.ok) return read.state;

  const limited = await checkRateLimit(
    rateLimitKey("rsvp-free-create", user.id),
    CREATE_LIMIT.limit,
    CREATE_LIMIT.windowSec,
  );
  if (!limited.allowed) {
    return { error: "You've made a lot of events today. Try again tomorrow." };
  }

  let eventId: string;
  try {
    eventId = await createInSpace(space.space.id, read.details);
  } catch (error) {
    return actionError(error);
  }
  redirect(`/rsvp/${eventId}?new=1`);
}

const updateInSpace = withOrgAction(async (ctx, eventId: string, details: Details) => {
  await updateEvent(ctx, eventId, details);
});

/** /rsvp/{id}/edit: the title, time, place and description. */
export async function updateFreeEvent(
  eventId: string,
  _prev: FreeEventState,
  form: FormData,
): Promise<FreeEventState> {
  const user = await requireUser();
  const space = await getPersonalSpace(user.id);
  if (!space) return { error: "That event no longer exists." };
  const read = readDetails(form, space.timezone);
  if (!read.ok) return read.state;
  try {
    await updateInSpace(space.id, eventId, read.details);
  } catch (error) {
    return actionError(error);
  }
  redirect(`/rsvp/${eventId}`);
}

const deleteInSpace = withOrgAction(async (ctx, eventId: string) => {
  await deleteEvent(ctx, eventId);
});

/** Deletes a free event; everyone still signed up is emailed that it's off. */
export async function deleteFreeEvent(eventId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const space = await getPersonalSpace(user.id);
  if (!space) return { error: "That event no longer exists." };
  try {
    await deleteInSpace(space.id, eventId);
  } catch (error) {
    return actionError(error);
  }
  redirect("/rsvp");
}

const recordMove = withOrgAction(async (ctx, eventId: string) => {
  await writeOrgAuditLog(ctx.db, {
    organizationId: ctx.organizationId,
    action: "event.saved_from_free_page",
    targetType: "Event",
    targetId: eventId,
  });
  const slug = await ctx.db.organization.findUniqueOrThrow({
    where: { id: ctx.organizationId },
    select: { slug: true },
  });
  return slug.slug;
});

/** "Save to a club": moves a free event, its guests and its link into a club the person runs. */
export async function saveFreeEventToClub(
  eventId: string,
  organizationId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const moved = await movePersonalEvent(user.id, eventId, organizationId);
  if (!moved) {
    return { error: "You can only move your own events into a club you own or run as an admin." };
  }
  const slug = await recordMove(organizationId, eventId);
  await setActiveOrgCookie(organizationId);
  redirect(`/app/${slug}/calendar/${eventId}/rsvp`);
}

/** "Start a club and save it there": onboarding, then the move. */
export async function startClubForFreeEvent(eventId: string): Promise<void> {
  await requireUser();
  if (!/^[a-z0-9]{8,40}$/i.test(eventId)) redirect("/rsvp");
  (await cookies()).set(PENDING_SAVE_COOKIE, eventId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  redirect("/onboarding/organization");
}
