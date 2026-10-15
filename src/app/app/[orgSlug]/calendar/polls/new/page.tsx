import { redirect } from "next/navigation";

/** Find a time has its own section now; old links and bookmarks land there. */
export default async function NewPollPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/polls/new">) {
  const { orgSlug } = await params;
  redirect(`/app/${orgSlug}/calendar/find-a-time/new`);
}
