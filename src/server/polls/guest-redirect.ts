import { headers } from "next/headers";

import { pollOrgId } from "@/app/poll/[pollId]/poll-org";
import { CALLBACK_HEADER } from "@/lib/auth/callback-url";
import { getSession } from "@/lib/auth/session";
import { withSystemOrgTx } from "@/server/db/context";

/**
 * The guest page for an availability poll opened at its in-app address
 * (/app/{slug}/calendar/find-a-time/{pollId}, or the /polls/ address it had
 * before Find a time was its own section) by someone who isn't a member of the
 * poll's org: signed out, or signed in without a membership there. That
 * address is what an organizer copies from the address bar, and without
 * this a guest would go through sign-in, sign-up and onboarding just to say
 * when they're free. The guest page asks for a name and nothing else.
 *
 * Null for a member (the app as usual), for any other path, and for a
 * question poll (members only, no guest page). The org layout calls this
 * only for a signed-out visitor or after a non-member's 404, so members pay
 * nothing for it. The path comes from the proxy's x-pathname header;
 * /poll/{id} is public to anyone with the id, so a forged header gains
 * nothing.
 */
export async function guestPollRedirect(orgSlug: string): Promise<string | null> {
  const pathname = ((await headers()).get(CALLBACK_HEADER) ?? "").split("?")[0];
  const match =
    /^\/app\/([a-z0-9-]+)\/calendar\/(?:polls|find-a-time)\/([A-Za-z0-9_-]{1,100})\/?$/.exec(
      pathname,
    );
  if (!match || match[1] !== orgSlug) return null;
  const pollId = match[2];

  const organizationId = await pollOrgId(pollId);
  if (!organizationId) return null;
  const session = await getSession();
  if (session) {
    const isMember = await withSystemOrgTx(
      organizationId,
      async ({ db }) =>
        (await db.membership.count({ where: { organizationId, userId: session.user.id } })) > 0,
    );
    if (isMember) return null;
  }
  return `/poll/${pollId}`;
}
