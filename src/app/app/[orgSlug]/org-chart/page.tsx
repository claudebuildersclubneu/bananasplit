import { FileUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ChartList } from "@/components/org-chart/chart-list";
import { ChartView } from "@/components/org-chart/chart-view";
import { StartDraftButton } from "@/components/org-chart/start-draft-button";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import type { ChartNodeDTO } from "@/lib/org-chart/types";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { getPublishedOrgChart } from "@/server/org-chart/queries";
import { planGate } from "@/server/billing/plan-gate";

import { PeopleTabs } from "../people/people-tabs";
import { ChartHeaderActions } from "./chart-header-actions";

export const metadata: Metadata = { title: "Org chart" };

/**
 * The published org chart (every member): People's second tab, beside the
 * directory. The chart comes from the cached
 * loader (tags.orgChart); membership is established first by
 * getOrgContextBySlug. ?view=list renders the accessible list on the
 * server; ?position={key} opens the side panel.
 */
export default async function OrgChartPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/org-chart">) {
  const { orgSlug } = await params;
  const planLock = await planGate(orgSlug, "people");
  if (planLock) return planLock;
  const query = await searchParams;
  const { organization, role } = await getOrgContextBySlug(orgSlug);
  const canEdit = can({ role }, "orgchart.write");
  const chart = await getPublishedOrgChart(organization.id);
  const mode = query.view === "list" ? "list" : "chart";
  const selectedKey = typeof query.position === "string" ? query.position : null;

  const openDraft = canEdit
    ? await withOrgTx(organization.id, ({ db }) =>
        db.orgChartVersion.findFirst({
          where: { organizationId: organization.id, status: "DRAFT" },
          orderBy: { createdAt: "desc" },
          select: { id: true, number: true },
        }),
      )
    : null;
  const base = `/app/${orgSlug}/org-chart`;
  const draftHref = openDraft ? `${base}/drafts/${openDraft.id}` : null;

  const nodes: ChartNodeDTO[] = (chart?.positions ?? []).map((p) => ({
    id: p.id,
    key: p.key,
    title: p.title,
    personName: p.personName,
    userId: p.userId,
    user: p.user
      ? { id: p.user.id, name: p.user.name, image: p.user.image, avatar: p.user.avatar }
      : null,
    reportsToId: p.reportsToId,
    isOpen: p.isOpen,
    isAdvisor: p.isAdvisor,
    responsibilities: p.responsibilities,
    decidesAlone: p.decidesAlone,
    rank: p.rank,
  }));

  const hrefFor = (key: string) =>
    `${base}?${mode === "list" ? "view=list&" : ""}position=${encodeURIComponent(key)}`;

  const published =
    chart &&
    [
      `Version ${chart.number}`,
      chart.publishedAt &&
        `published ${new Date(chart.publishedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: organization.timezone,
        })}`,
      `${nodes.length} positions`,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        description={published ?? "Roles and who reports to whom."}
        actions={
          <ChartHeaderActions
            orgId={organization.id}
            orgSlug={orgSlug}
            mode={mode}
            hasChart={Boolean(chart)}
            canEdit={canEdit}
            draft={draftHref && openDraft ? { href: draftHref, number: openDraft.number } : null}
          />
        }
        tabs={<PeopleTabs orgSlug={orgSlug} />}
      />

      {chart && nodes.length > 0 ? (
        <Suspense fallback={<ChartList nodes={nodes} hrefFor={hrefFor} />}>
          <ChartView
            orgId={organization.id}
            orgSlug={orgSlug}
            nodes={nodes}
            mode={mode}
            canEdit={canEdit}
            draftHref={draftHref}
            listFallback={<ChartList nodes={nodes} hrefFor={hrefFor} selectedKey={selectedKey} />}
          />
        </Suspense>
      ) : (
        <EmptyState
          title="No org chart yet"
          description={
            canEdit
              ? "Import your org chart document (Word, Google Doc export, Markdown, text or PDF) and review it before publishing, start from the club template, or build it by hand."
              : `${organization.name}'s reporting lines, roles and responsibilities will appear here once an admin publishes the chart.`
          }
          action={
            canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`${base}/import`}>
                    <FileUp className="size-4" aria-hidden="true" />
                    Import a document
                  </Link>
                </Button>
                {draftHref ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={draftHref}>Continue draft v{openDraft?.number}</Link>
                  </Button>
                ) : (
                  <>
                    <StartDraftButton orgId={organization.id} orgSlug={orgSlug} from="starter">
                      Start from the club template
                    </StartDraftButton>
                    <StartDraftButton
                      orgId={organization.id}
                      orgSlug={orgSlug}
                      from="blank"
                      variant="ghost"
                    >
                      Start from scratch
                    </StartDraftButton>
                  </>
                )}
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
