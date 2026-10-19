import { PageHeader } from "@/components/page-header";
import { getUserIdentity } from "@/lib/auth/email-verification";
import { isPlatformAdmin } from "@/lib/auth/org-creation";
import { can } from "@/lib/auth/permissions";
import { CBC_PEOPLE } from "@/server/bootstrap/cbc-template";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { EXPORT_EXPIRY_DAYS } from "@/server/export/service";
import { suggestCbcMapping } from "@/server/settings/bootstrap";

import { SettingsNoAccess } from "../settings-no-access";
import { BootstrapCard } from "./bootstrap-card";
import { DeleteCard } from "./delete-card";
import { ExportCard, type ExportRow } from "./export-card";

/**
 * Settings > Danger zone: export all data, delete. OWNER only. Platform
 * admins also see the CBC template (the platform's own club).
 */
export default async function DangerZonePage({
  params,
}: PageProps<"/app/[orgSlug]/settings/danger">) {
  const { orgSlug } = await params;
  const { organization, role, settings, user } = await getOrgContextBySlug(orgSlug);
  if (!can({ role }, "org.delete")) {
    return <SettingsNoAccess title="Danger zone" who="owners" />;
  }
  const orgId = organization.id;
  const personal = organization.kind === "PERSONAL";

  const { exports, members } = await withOrgTx(orgId, async ({ db }) => {
    const exports = await db.orgExport.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        downloadCount: true,
        requestedBy: { select: { name: true } },
      },
    });
    const members = await db.membership.findMany({
      where: { organizationId: orgId },
      select: { userId: true, user: { select: { name: true } } },
    });
    return { exports, members };
  });

  const exportRows: ExportRow[] = exports.map((e) => ({
    id: e.id,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
    expiresAt: e.expiresAt?.toISOString() ?? null,
    downloadCount: e.downloadCount,
    requestedByName: e.requestedBy?.name ?? null,
  }));
  const memberOptions = members
    .map((m) => ({ userId: m.userId, name: m.user.name ?? "Unnamed member" }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const suggested = suggestCbcMapping(
    members.map((m) => ({ userId: m.userId, name: m.user.name })),
  ) as Record<string, string>;

  const latest = exports[0];
  const latestWord: Record<string, string> = {
    PENDING: "queued",
    RUNNING: "preparing",
    READY: "ready to download",
    FAILED: "failed",
    EXPIRED: "expired",
  };
  const summary = latest
    ? `Last export ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(latest.createdAt)}, ${latestWord[latest.status] ?? latest.status.toLowerCase()}`
    : "No exports yet";

  return (
    <div className="max-w-3xl space-y-7.5">
      <PageHeader title="Danger zone" description={summary} />
      <div className="space-y-4.5">
        <ExportCard
          orgId={orgId}
          orgSlug={organization.slug}
          exports={exportRows}
          expiryDays={EXPORT_EXPIRY_DAYS}
          personal={personal}
        />
        {!personal &&
          can({ role }, "workspace.bootstrap") &&
          isPlatformAdmin(await getUserIdentity(user.id)) && (
            <BootstrapCard
              orgId={orgId}
              people={CBC_PEOPLE.map((p) => ({ key: p.key, name: p.name, title: p.title }))}
              members={memberOptions}
              suggested={suggested}
              bootstrappedAt={settings?.bootstrappedAt?.toISOString() ?? null}
            />
          )}
        <DeleteCard
          orgId={orgId}
          orgName={organization.name}
          slug={organization.slug}
          personal={personal}
        />
      </div>
    </div>
  );
}
