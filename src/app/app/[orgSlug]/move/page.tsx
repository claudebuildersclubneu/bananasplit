import Link from "next/link";
import { notFound } from "next/navigation";

import { startClubWithItemAction } from "@/app/onboarding/organization/[orgSlug]/bring-actions";
import { pill } from "@/components/brand/pill";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { orgStepHref } from "@/lib/onboarding/steps";
import { getOrgContextBySlug } from "@/server/db/context";
import { isBringId } from "@/server/personal/bring-cookie";
import { clubsUserRuns } from "@/server/personal/move";

export const metadata = { title: "Move to a club · Bananasplit" };

/**
 * Move to a club (docs/features/personal-and-clubs.md): from Personal, pick
 * a club you own or run and you land on its "Bring anything in?" list with
 * ?item ticked; or start a club, and club setup ends on that list with it
 * ticked. Personal only. Link here from an event or poll as
 * /app/{personal slug}/move?item={eventId|pollId|taskId}.
 */
export default async function MoveToClubPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/move">) {
  const { orgSlug } = await params;
  const { organization, user } = await getOrgContextBySlug(orgSlug);
  if (organization.kind !== "PERSONAL") notFound();
  const { item } = await searchParams;
  const itemId = isBringId(item) ? item : null;
  const clubs = await clubsUserRuns(user.id);
  const bringHref = (slug: string) => {
    const q = new URLSearchParams({ from: "move" });
    if (itemId) q.set("bring", itemId);
    return `${orgStepHref(slug, "bring")}?${q}`;
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header>
        <h1 className="page-title">Move to a club</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Events, polls and tasks move one way, with their links, RSVPs, tickets and responses.
        </p>
      </header>

      {clubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clubs you run</CardTitle>
            <CardDescription>Pick one, then choose what to bring.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {clubs.map((club) => (
                <li key={club.id}>
                  <Link
                    href={bringHref(club.slug)}
                    className="border-ink/10 hover:border-ink/25 flex h-[50px] items-center justify-between rounded-xl border px-4 text-[15px] font-semibold"
                  >
                    {club.name}
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{clubs.length ? "Or start a new club" : "Start a club"}</CardTitle>
          <CardDescription>
            A new club is free for 30 days. At the end of setup, you choose what to bring in
            {itemId ? ", with this one already picked" : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={startClubWithItemAction.bind(null, itemId ?? "")}>
            <button type="submit" className={pill({ size: "sm" })}>
              Start a club
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
