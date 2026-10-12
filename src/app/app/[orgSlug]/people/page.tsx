import { ChevronLeft, ChevronRight } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { majorAndYear } from "@/components/profile/profile-links";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { UserAvatar } from "@/components/user-avatar";
import { PinToggle } from "@/components/pins/pins-context";
import { peopleHref, personHref } from "@/lib/profile/href";
import { getOrgContextBySlug } from "@/server/db/context";
import { listOrgPeople, parsePageParam, parseSearchParam } from "@/server/profiles/queries";

import { PeopleTabs } from "./people-tabs";

/**
 * The people directory (Phase 2): every current member of this org, 50 per
 * page, with their picture, pronouns, this org's title, and major and year.
 * The first of People's two tabs (the org chart is the other). Members only
 * (getOrgContextBySlug answers 404 to anyone else).
 */
export default async function PeoplePage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/people">) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const { organization, user } = await getOrgContextBySlug(orgSlug);

  const q = parseSearchParam(query.q);
  const { people, total, page, pageCount } = await listOrgPeople(organization.id, {
    page: parsePageParam(query.page),
    q,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        description={
          q
            ? `${total} ${total === 1 ? "match" : "matches"} for “${q}”`
            : `${total} ${total === 1 ? "member" : "members"} of ${organization.name}`
        }
        actions={
          <Form action={peopleHref(orgSlug)} className="w-full sm:w-auto" role="search">
            <label htmlFor="people-search" className="sr-only">
              Search people
            </label>
            <SearchField
              id="people-search"
              name="q"
              defaultValue={q}
              placeholder="Search name, title or major"
              className="sm:w-64"
              maxLength={80}
            />
          </Form>
        }
        tabs={<PeopleTabs orgSlug={orgSlug} />}
      />

      {people.length === 0 ? (
        <EmptyState
          title={q ? "No one matches that search" : "No members yet"}
          description={q ? "Try a name, a title like “VP”, or a major." : undefined}
          action={
            q ? (
              <Button asChild variant="outline" size="sm">
                <Link href={peopleHref(orgSlug)}>Clear search</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => {
            const detail = majorAndYear(person.major, person.gradYear);
            const isSelf = person.id === user.id;
            return (
              <li key={person.id} className="group relative">
                <PinToggle
                  href={personHref(orgSlug, person.id)}
                  label={person.name ?? "member"}
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                />
                <Link
                  href={personHref(orgSlug, person.id)}
                  className="bg-card hover:bg-muted/50 focus-visible:ring-ring/50 flex h-full items-center gap-3 rounded-xl border p-3 transition-colors outline-none focus-visible:ring-3"
                >
                  <UserAvatar user={person} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {person.name ?? "Unnamed member"}
                      {person.pronouns && (
                        <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                          {person.pronouns}
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                          (you)
                        </span>
                      )}
                    </p>
                    {person.title && <p className="truncate text-sm">{person.title}</p>}
                    {detail && <p className="text-muted-foreground truncate text-xs">{detail}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={peopleHref(orgSlug, { q, page: page - 1 })} rel="prev">
                <ChevronLeft className="size-4" aria-hidden="true" />
                Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <p className="text-muted-foreground text-sm tabular-nums">
            Page {page} of {pageCount}
          </p>
          {page < pageCount ? (
            <Button asChild variant="outline" size="sm">
              <Link href={peopleHref(orgSlug, { q, page: page + 1 })} rel="next">
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
