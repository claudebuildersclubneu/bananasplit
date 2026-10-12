"use client";

import { Loader2, RefreshCw, RotateCcw, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { syncNowAction } from "@/app/app/[orgSlug]/databases/actions";
import { ItemMenu } from "@/components/item-menu";
import { Badge } from "@/components/ui/badge";

export interface SyncPanelStream {
  stream: string;
  label: string;
  lastSynced: string | null;
  rowsUpserted: number;
  lastError: string | null;
  detail: string | null;
}

/**
 * Website sync status (ADMIN+). The sync runs by itself every few minutes,
 * so "Sync now", "Full reconcile" and the connection's Admin panel page sit
 * in the "…" menu. Sync now only enqueues the job and kicks the drain; the
 * numbers update when the job finishes (refresh the page).
 */
export function SyncPanel({
  organizationId,
  status,
  lastError,
  endpoint,
  configError,
  streams,
  settingsHref,
}: {
  organizationId: string;
  status: string;
  lastError: string | null;
  endpoint: string | null;
  configError: string | null;
  streams: SyncPanelStream[];
  settingsHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sync = (full: boolean) => {
    if (
      full &&
      !window.confirm("Re-read everything from the website and remove rows it no longer has?")
    )
      return;
    setError(null);
    start(async () => {
      const result = await syncNowAction(organizationId, full);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <section className="space-y-3 rounded-xl border p-4" aria-labelledby="sync-heading">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="sync-heading" className="flex items-center gap-2 text-sm font-semibold">
            Website data sync
            <Badge
              variant={
                status === "CONNECTED"
                  ? "default"
                  : status === "ERROR"
                    ? "destructive"
                    : "secondary"
              }
            >
              {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
            </Badge>
            {pending && (
              <Loader2 className="text-muted-foreground size-4 animate-spin" aria-label="Syncing" />
            )}
          </h2>
          <p className="text-muted-foreground text-xs">
            {endpoint
              ? `Reads ${endpoint} through the suite export.`
              : (configError ?? "Not configured.")}
          </p>
        </div>
        <ItemMenu
          label="Website sync actions"
          items={[
            { label: "Sync now", icon: RefreshCw, onSelect: () => sync(false), disabled: pending },
            {
              label: "Full reconcile…",
              icon: RotateCcw,
              onSelect: () => sync(true),
              disabled: pending,
            },
            {
              label: "Admin panel › Integrations",
              icon: Settings2,
              href: settingsHref,
              separated: true,
            },
          ]}
        />
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
      {lastError && (
        <p role="status" className="text-destructive text-xs">
          Last error: {lastError}
        </p>
      )}
      <table className="w-full text-xs">
        <thead className="text-muted-foreground text-left">
          <tr>
            <th className="py-1 font-medium">Stream</th>
            <th className="py-1 font-medium">Last sync</th>
            <th className="py-1 text-right font-medium">Rows written</th>
            <th className="py-1 pl-3 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {streams.map((s) => (
            <tr key={s.stream} className="border-t">
              <td className="py-1.5">{s.label}</td>
              <td className="py-1.5">{s.lastSynced ?? "Never"}</td>
              <td className="py-1.5 text-right tabular-nums">{s.rowsUpserted.toLocaleString()}</td>
              <td className="py-1.5 pl-3">
                {s.lastError ? (
                  <span className="text-destructive">{s.lastError}</span>
                ) : (
                  (s.detail ?? "")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
