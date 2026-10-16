"use client";

import { type FormEvent, useState, useTransition } from "react";

import { inviteMember } from "@/app/app/[orgSlug]/settings/members/actions";
import { brandInputClass } from "@/components/brand/fields";
import { pill } from "@/components/brand/pill";
import {
  ContinuePill,
  PreviewHeader,
  PreviewTile,
  SetupCard,
  StepBody,
  StepError,
  StepFooter,
  StepIntro,
} from "@/components/onboarding/setup-shell";
import { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

import { goToNextOrgStep } from "./actions";

type InviteRole = typeof Role.ADMIN | typeof Role.TREASURER | typeof Role.MEMBER;

const ROLES: { value: InviteRole; label: string }[] = [
  { value: Role.ADMIN, label: "Admin" },
  { value: Role.TREASURER, label: "Treasurer" },
  { value: Role.MEMBER, label: "Member" },
];

const roleLabel = (role: string) =>
  ROLES.find((r) => r.value === role)?.label ?? role.charAt(0) + role.slice(1).toLowerCase();

const AVATAR_TONES = ["bg-banana", "bg-wheat", "bg-dusk", "bg-spot text-cream"] as const;

/**
 * B6 · Invite officers: email invites (the same invites as Settings >
 * Members, valid for 7 days) and the club's code, which anyone can use to
 * join as a member. Then B7: bring things in from Personal (or straight
 * into the club as its admin when there's nothing to bring).
 */
export function InviteStep({
  orgId,
  orgSlug,
  index,
  total,
  backHref,
  me,
  code,
  joinUrl,
  invites,
}: {
  orgId: string;
  orgSlug: string;
  index: number;
  total: number;
  backHref: string;
  me: { name: string | null; email: string };
  /** The club's code, when it's turned on. */
  code: string | null;
  joinUrl: string;
  invites: { email: string; role: string }[];
}) {
  const [sent, setSent] = useState(invites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>(Role.ADMIN);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [inviting, startInvite] = useTransition();
  const [finishing, startFinish] = useTransition();

  function invite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startInvite(async () => {
      const result = await inviteMember(orgId, { email, role });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSent([{ email: email.trim().toLowerCase(), role }, ...sent]);
      setEmail("");
    });
  }

  async function copy(what: "code" | "link") {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(what === "code" ? code : `${joinUrl}?code=${code}`);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Couldn't copy. Select the code and copy it instead.");
    }
  }

  const finish = () => startFinish(() => goToNextOrgStep(orgSlug, "invite"));

  return (
    <SetupCard
      preview={
        <>
          <PreviewHeader meta="Who's joining" />
          <PreviewTile className="flex-row items-center gap-3">
            <span className="bg-ink text-cream grid size-9 flex-none place-items-center rounded-full text-[13px] font-bold">
              {(me.name ?? me.email).trim()[0]?.toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-semibold">{me.name ?? me.email}</span>
              <span className="text-ink-soft text-[12px]">Owner · that&apos;s you</span>
            </span>
          </PreviewTile>
          {sent.map((invite, i) => (
            <PreviewTile key={invite.email} className="flex-row items-center gap-3">
              <span
                className={cn(
                  "grid size-9 flex-none place-items-center rounded-full text-[13px] font-bold",
                  AVATAR_TONES[i % AVATAR_TONES.length],
                )}
              >
                {invite.email[0]?.toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-semibold">{invite.email}</span>
                <span className="text-ink-soft text-[12px]">
                  {roleLabel(invite.role)} · invited
                </span>
              </span>
            </PreviewTile>
          ))}
          {code && (
            <p className="text-ink-faint m-0 mt-auto text-[12px] leading-normal">
              Anyone with the code <b className="text-ink-muted font-mono">{code}</b> and a verified
              email can join as a member.
            </p>
          )}
        </>
      }
    >
      <StepIntro index={index} total={total} title="Bring in your officers.">
        Invite each officer by email, or share your invite code. Members can join with the code any
        time.
      </StepIntro>

      <StepBody className="gap-5">
        {code && (
          <div className="bg-oat flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-4 py-3.5">
            <span className="flex flex-col gap-1">
              <span className="text-ink-soft text-[13px] font-semibold">Your invite code</span>
              <span
                className="font-heading text-[30px] leading-none tracking-[0.12em]"
                aria-label={`Invite code ${code.split("").join(" ")}`}
              >
                {code}
              </span>
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => copy("code")}
                className={pill({ tone: "outline", size: "sm" })}
              >
                {copied === "code" ? "Copied" : "Copy code"}
              </button>
              <button
                type="button"
                onClick={() => copy("link")}
                className={pill({ tone: "outline", size: "sm" })}
              >
                {copied === "link" ? "Copied" : "Copy link"}
              </button>
            </span>
          </div>
        )}

        <form onSubmit={invite} className="flex flex-col gap-2">
          <label htmlFor="invite-email" className="text-[14px] font-semibold">
            Invite an officer by email
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@example.com"
              autoComplete="off"
              className={cn(brandInputClass, "min-w-0 flex-[1_1_220px]")}
            />
            <select
              aria-label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
              className={cn(brandInputClass, "w-auto flex-none cursor-pointer pr-3")}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting || !email.trim()}
              className={cn(pill({ size: "field" }), "flex-none")}
            >
              {inviting ? "Sending…" : "Send invite"}
            </button>
          </div>
          <span className="text-ink-soft text-[13px]">
            The link is valid for 7 days. They sign in with this address to join.
          </span>
        </form>

        {sent.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Invites sent">
            {sent.map((invite) => (
              <li
                key={invite.email}
                className="bg-paper border-ink/10 flex h-[50px] items-center gap-3 rounded-xl border px-4"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                  {invite.email}
                </span>
                <span className="text-ink-soft text-[13px]">{roleLabel(invite.role)}</span>
                <span className="bg-leaf text-leaf-ink rounded-full px-2 py-0.5 text-[11px] font-bold">
                  ✓ Invited
                </span>
              </li>
            ))}
          </ul>
        )}
      </StepBody>

      <StepError message={error} />
      <StepFooter
        back={{ href: backHref }}
        skip={
          sent.length === 0
            ? { onClick: finish, disabled: finishing, label: "Skip for now" }
            : undefined
        }
      >
        <ContinuePill pending={finishing} pendingLabel="One moment…" onClick={finish}>
          Continue
        </ContinuePill>
      </StepFooter>
    </SetupCard>
  );
}
