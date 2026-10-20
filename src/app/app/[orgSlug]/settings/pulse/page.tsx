import Link from "next/link";

import { can } from "@/lib/auth/permissions";
import { DEFAULT_PULSE_SETTINGS } from "@/lib/pulse/settings";
import { planGate } from "@/server/billing/plan-gate";
import { getOrgContextBySlug } from "@/server/db/context";

import { SettingsNoAccess } from "../settings-no-access";
import { PulseSettingsForm } from "./pulse-settings-form";

export const metadata = { title: "Weekly pulse" };

/**
 * Admin panel › Weekly pulse (OWNER/ADMIN): when the club's weekly recap
 * goes out, to whom, and how. The same fields as the club setup step.
 */
export default async function PulseSettingsPage({
  params,
}: PageProps<"/app/[orgSlug]/settings/pulse">) {
  const { orgSlug } = await params;
  const locked = await planGate(orgSlug, "overview", { title: "Weekly pulse" });
  if (locked) return locked;
  const { organization, role, settings } = await getOrgContextBySlug(orgSlug);
  if (!can({ role }, "settings.view")) {
    return <SettingsNoAccess title="Weekly pulse" who="owners and admins" />;
  }
  const initial = settings
    ? {
        pulseEnabled: settings.pulseEnabled,
        pulseDay: settings.pulseDay,
        pulseHourLocal: settings.pulseHourLocal,
        pulseAudience: settings.pulseAudience,
        pulseEmail: settings.pulseEmail,
        pulseInApp: settings.pulseInApp,
      }
    : DEFAULT_PULSE_SETTINGS;
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="page-title">Weekly pulse</h1>
        <p className="text-muted-foreground max-w-prose text-sm">
          A short recap of what {organization.name} got done: work finished, who came, decisions
          and next week. Members can turn the email off on their profile.{" "}
          <Link href={`/app/${organization.slug}/pulse`} className="text-foreground underline underline-offset-4">
            See past weeks
          </Link>
        </p>
      </div>
      <PulseSettingsForm
        orgId={organization.id}
        initial={initial}
        canEdit={can({ role }, "settings.general.write")}
      />
    </div>
  );
}
