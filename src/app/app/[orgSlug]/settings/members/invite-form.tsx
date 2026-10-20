"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@/generated/prisma/enums";

import { SettingsCard, SettingsStatus } from "../settings-card";
import { inviteMember } from "./actions";

/** The "Invite people" card: an email, a role, and the card's one Send invite. */
export function InviteForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(Role.MEMBER);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await inviteMember(orgId, { email, role });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess("Invite sent.");
      setEmail("");
      router.refresh();
    });
  }

  const status = error
    ? ({ tone: "error", text: error } as const)
    : success
      ? ({ tone: "ok", text: success } as const)
      : null;

  return (
    <form onSubmit={handleSubmit} className="h-full">
      <SettingsCard
        title="Invite people"
        description="They get an email link that is valid for 7 days. They must sign in with the invited address, and verify it, to join."
        className="h-full"
        status={status && <SettingsStatus status={status} />}
        footer={
          <Button type="submit" disabled={isPending}>
            {isPending ? "Sending…" : "Send invite"}
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <div className="grid gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.edu"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                <SelectItem value={Role.TREASURER}>Treasurer</SelectItem>
                <SelectItem value={Role.MEMBER}>Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsCard>
    </form>
  );
}
