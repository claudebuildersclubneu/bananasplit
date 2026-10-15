import { QuestionPollForm } from "@/components/calendar/question-poll-form";
import { getOrgContextBySlug } from "@/server/db/context";
import { planGate } from "@/server/billing/plan-gate";

/** "Ask a question": any member starts a question poll. */
export default async function AskQuestionPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/polls/ask">) {
  const { orgSlug } = await params;
  const planLock = await planGate(orgSlug, "polls");
  if (planLock) return planLock;
  const { organization: org } = await getOrgContextBySlug(orgSlug);
  return <QuestionPollForm orgId={org.id} orgSlug={orgSlug} />;
}
