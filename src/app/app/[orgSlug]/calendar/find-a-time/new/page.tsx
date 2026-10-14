import { PollForm } from "@/components/calendar/poll-form";
import { getOrgContextBySlug } from "@/server/db/context";

/** A new find-a-time (availability) poll: any member starts one. */
export default async function NewFindATimePage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/find-a-time/new">) {
  const { orgSlug } = await params;
  const { organization: org } = await getOrgContextBySlug(orgSlug);
  return <PollForm orgId={org.id} orgSlug={orgSlug} defaultTimezone={org.timezone} />;
}
