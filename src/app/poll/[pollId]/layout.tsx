import type { Metadata } from "next";

import { PublicOrgFrame } from "@/components/theme/public-org-frame";
import { getPublicOrgTheme, orgIdForPoll } from "@/lib/theme/loader";

/**
 * What a shared poll link previews as (iMessage, Slack, X): an ask to fill
 * the poll in, not the site-wide card. The image is opengraph-image.png and
 * twitter-image.png beside this file.
 */
const shareTitle = "Fill out this availability poll";
const shareDescription = "Mark the times you're free. No account needed, just your name.";

export const metadata: Metadata = {
  title: `${shareTitle} · Bananasplit`,
  description: shareDescription,
  openGraph: { title: shareTitle, description: shareDescription, siteName: "Bananasplit" },
  twitter: { card: "summary_large_image", title: shareTitle, description: shareDescription },
};

/**
 * Themes the public availability poll with the org that runs it (B8): the
 * org's colours, default mode and logo. The page itself is the Calendar
 * builder's; this layout only frames it.
 */
export default async function PublicPollLayout({
  params,
  children,
}: LayoutProps<"/poll/[pollId]">) {
  const { pollId } = await params;
  const org = await getPublicOrgTheme(await orgIdForPoll(pollId));
  return (
    <PublicOrgFrame org={org} wide>
      {children}
    </PublicOrgFrame>
  );
}
