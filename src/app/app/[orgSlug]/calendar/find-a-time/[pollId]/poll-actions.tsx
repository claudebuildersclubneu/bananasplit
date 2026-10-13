"use client";

import { ExternalLink, Link2, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

import { ItemMenu } from "@/components/item-menu";
import { PinToggle } from "@/components/pins/pins-context";
import { copyGuestPollLink, copyPollLink } from "@/components/polls/copy-link";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";

import { deletePoll } from "../../polls/actions";

/**
 * An availability poll's header: while it's open, one click to invite
 * guests (it copies the guest link, which is all a guest needs: they type a
 * name on it, no account and no onboarding); then the pin, and the "…" menu
 * for the rest. Delete is for the poll's creator or an owner/admin
 * (deletePoll checks again).
 */
export function AvailabilityPollActions({
  orgId,
  orgSlug,
  pollId,
  title,
  isOpen,
  canDelete,
  scheduled,
}: {
  orgId: string;
  orgSlug: string;
  pollId: string;
  title: string;
  /** Takes answers, so guests can still be invited. */
  isOpen: boolean;
  canDelete: boolean;
  /** A scheduled poll's event stays on the calendar. */
  scheduled: boolean;
}) {
  const router = useRouter();
  const [confirmElement, confirm] = useConfirm();
  const href = `/app/${orgSlug}/calendar/find-a-time/${pollId}`;

  async function remove() {
    const deleted = await confirm({
      title: `Delete “${title}”?`,
      description: `Everyone's answers are deleted and the link stops working.${
        scheduled ? " The event it scheduled stays on the calendar." : ""
      }`,
      confirmLabel: "Delete poll",
      run: async () => (await deletePoll(orgId, pollId)).error,
    });
    if (!deleted) return;
    toast({ title: "Poll deleted", description: title });
    router.push(`/app/${orgSlug}/calendar/find-a-time`);
  }

  return (
    <>
      {confirmElement}
      {isOpen && (
        <Button type="button" variant="outline" size="sm" onClick={() => copyGuestPollLink(pollId)}>
          <UserPlus aria-hidden className="size-4" />
          Invite guests
        </Button>
      )}
      <PinToggle href={href} label={title} />
      <ItemMenu
        label="Poll actions"
        items={[
          { label: "Copy link", icon: Link2, onSelect: () => copyPollLink(href) },
          isOpen && {
            label: "Open guest view",
            icon: ExternalLink,
            onSelect: () => window.open(`/poll/${pollId}`, "_blank", "noopener,noreferrer"),
          },
          canDelete && {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onSelect: () => void remove(),
          },
        ]}
      />
    </>
  );
}
