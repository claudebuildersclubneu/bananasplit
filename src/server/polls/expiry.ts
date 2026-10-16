import type { Prisma } from "@/generated/prisma/client";
import { availabilityExpiryCutoff } from "@/lib/polls/expiry";

/**
 * The Prisma side of src/lib/polls/expiry.ts: which Find a time polls are
 * still kept, and which are past keeping (FIND_A_TIME_KEEP_DAYS after the
 * last day they offer).
 */

/** Still kept: a slot ends inside the window (or, oddly, it has none). */
export function keptAvailabilityPoll(now: Date): Prisma.AvailabilityPollWhereInput {
  const cutoff = availabilityExpiryCutoff(now);
  return { OR: [{ slots: { none: {} } }, { slots: { some: { endsAt: { gte: cutoff } } } }] };
}

/** Past keeping: it has slots, and every one ended before the cutoff. */
export function expiredAvailabilityPoll(now: Date): Prisma.AvailabilityPollWhereInput {
  const cutoff = availabilityExpiryCutoff(now);
  return { slots: { some: {}, every: { endsAt: { lt: cutoff } } } };
}
