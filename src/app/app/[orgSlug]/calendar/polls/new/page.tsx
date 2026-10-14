import { redirect } from "next/navigation";

/** Where "Find a time" used to start: the form lives under Find a time now. */
export default async function NewPollPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/polls/new">) {
  const { orgSlug } = await params;
  redirect(`/app/${orgSlug}/calendar/find-a-time/new`);
}
