import "server-only";

import { spaceLimits } from "@/lib/billing/space";
import { getOrgContextBySlug } from "@/server/db/context";
import { canManageStorage, readStorageUsed } from "@/server/storage/quota";

import { StorageBanner } from "./storage-banner";

/**
 * The storage banner, loaded on the server for the space at `orgSlug`
 * (redesign guide 11.2). Drop it into a server page's header, e.g. the
 * Files tab of /notes:
 *
 *   <SpaceStorageBanner orgSlug={orgSlug} className="mb-4" />
 *
 * Renders nothing for members, and nothing under 80%. One indexed read
 * (the org context is cached per request).
 */
export async function SpaceStorageBanner({
  orgSlug,
  className,
}: {
  orgSlug: string;
  className?: string;
}) {
  const { organization, role } = await getOrgContextBySlug(orgSlug);
  if (!canManageStorage(role)) return null;
  const usedBytes = await readStorageUsed(organization.id);
  return (
    <StorageBanner
      orgSlug={organization.slug}
      usedBytes={usedBytes}
      limitBytes={spaceLimits(organization).storageBytes}
      canManage
      personal={organization.kind === "PERSONAL"}
      className={className}
    />
  );
}
