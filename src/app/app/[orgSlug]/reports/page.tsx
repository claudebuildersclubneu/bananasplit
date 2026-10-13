import { redirect } from "next/navigation";
import { planGate } from "@/server/billing/plan-gate";

/** Reports moved into Databases (a tab there); old links and bookmarks land on it. */
export default async function ReportsRedirect({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/reports">) {
  const { orgSlug } = await params;
  const planLock = await planGate(orgSlug, "reports");
  if (planLock) return planLock;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value ? [value] : []) qs.append(key, v);
  }
  const query = qs.toString();
  redirect(`/app/${orgSlug}/databases/reports${query ? `?${query}` : ""}`);
}
