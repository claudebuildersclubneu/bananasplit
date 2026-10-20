import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { PageTabs } from "@/components/ui/page-tabs";

/**
 * Settings › Plan and storage: one section, two pages (the plan and its
 * tiers; the storage meter, largest files and the trash), under one title.
 */
export function PlanHeader({
  orgSlug,
  title = "Plan and storage",
  description,
  actions,
}: {
  orgSlug: string;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const base = `/app/${orgSlug}/settings/plan`;
  return (
    <PageHeader
      title={title}
      description={description}
      actions={actions}
      tabs={
        <PageTabs
          label="Plan and storage"
          tabs={[
            { href: base, label: "Plan", exact: true },
            { href: `${base}/storage`, label: "Storage" },
          ]}
        />
      }
    />
  );
}
