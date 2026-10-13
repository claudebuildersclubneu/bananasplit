"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SUCCESS_TEXT } from "@/lib/status-tones";

import { resendInvitation, revokeInvitation } from "./actions";

export interface PendingInviteRow {
  id: string;
  email: string;
  role: string;
  /** ISO string. */
  expiresAt: string;
  expired: boolean;
  invitedByName: string | null;
}

function InviteRow({
  orgId,
  invite,
  dateFormat,
}: {
  orgId: string;
  invite: PendingInviteRow;
  dateFormat: Intl.DateTimeFormat;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  function run(action: () => Promise<{ error?: string } | undefined>, ok: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setMessage({ tone: "error", text: result.error });
      else {
        setMessage({ tone: "ok", text: ok });
        router.refresh();
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{invite.email}</span>
          {invite.expired && <Badge variant="outline">Expired</Badge>}
        </div>
        <div className="text-muted-foreground text-xs">
          Invited as {invite.role.toLowerCase()}
          {invite.invitedByName ? ` by ${invite.invitedByName}` : ""} ·{" "}
          {invite.expired ? "expired" : "expires"} {dateFormat.format(new Date(invite.expiresAt))}
        </div>
        {message && (
          <p
            role="status"
            className={
              message.tone === "error" ? "text-destructive text-xs" : `text-xs ${SUCCESS_TEXT}`
            }
          >
            {message.text}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          aria-label={`Resend invite to ${invite.email}`}
          onClick={() => run(() => resendInvitation(orgId, invite.id), "A new link is on its way.")}
        >
          Resend
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          aria-label={`Revoke invite for ${invite.email}`}
          onClick={() => run(() => revokeInvitation(orgId, invite.id), "Invite revoked.")}
        >
          Revoke
        </Button>
      </div>
    </li>
  );
}

/**
 * `timeZone`: the org's. Expiry dates are formatted in it, not in whatever
 * zone the server or the browser is in, so the server's HTML and the
 * browser's first render agree (a date near midnight would otherwise
 * differ, a hydration mismatch).
 */
export function PendingInvites({
  orgId,
  invites,
  timeZone,
}: {
  orgId: string;
  invites: PendingInviteRow[];
  timeZone: string;
}) {
  if (invites.length === 0) {
    return <p className="text-muted-foreground text-sm">No pending invites.</p>;
  }
  const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone });
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Pending invites</h3>
      <ul className="space-y-2">
        {invites.map((invite) => (
          <InviteRow key={invite.id} orgId={orgId} invite={invite} dateFormat={dateFormat} />
        ))}
      </ul>
    </div>
  );
}
