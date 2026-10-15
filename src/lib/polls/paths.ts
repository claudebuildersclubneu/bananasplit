/**
 * Where a poll lives in a space (`base` is /app/{slug}): a question under
 * Polls, a find-a-time poll under Find a time. /calendar/polls/{id} still
 * opens either (a find-a-time poll's old address forwards), so links made
 * before the split keep working.
 */
export function pollHref(base: string, kind: "question" | "availability", id: string): string {
  return `${base}/calendar/${kind === "question" ? "polls" : "find-a-time"}/${id}`;
}
