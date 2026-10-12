"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { CodeBoxes, cleanCode } from "@/components/brand/code-boxes";
import { pill } from "@/components/brand/pill";
import { JOIN_CODE_LENGTH, SHORT_JOIN_CODE_LENGTH } from "@/lib/join-code-format";
import { cn } from "@/lib/utils";

import { checkInviteCodeAction, joinWithInviteCodeAction, type CheckCodeResult } from "./actions";

type Found = Extract<CheckCodeResult, { ok: true }>;

function emptyCode(length = JOIN_CODE_LENGTH): string[] {
  return Array.from({ length }, () => "");
}

/** ?code= from an admin's shared link: eight boxes, or six for an older short code. */
function initialBoxes(initialCode: string): string[] {
  const chars = cleanCode(initialCode);
  const length =
    chars.length === SHORT_JOIN_CODE_LENGTH ? SHORT_JOIN_CODE_LENGTH : JOIN_CODE_LENGTH;
  return Array.from({ length }, (_, i) => chars[i] ?? "");
}

/**
 * Enter the club's code in eight boxes, XXXX-XXXX (design: App screens, 03). Once every
 * box is filled the club is looked up on the server (the code, the verified
 * email and the club's allowed domain) and shown before anyone joins.
 */
export function JoinForm({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(() => initialBoxes(initialCode));
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [joining, startJoin] = useTransition();
  // The code the latest lookup was for, so a stale answer is dropped.
  const latest = useRef("");
  const boxes = useRef<HTMLDivElement>(null);

  const value = code.join("");
  const complete = code.every(Boolean);
  const empty = code.every((c) => !c);

  useEffect(() => {
    latest.current = complete ? value : "";
    if (!complete) return;
    startCheck(async () => {
      const result = await checkInviteCodeAction(value);
      if (latest.current !== value) return;
      if (result.ok) {
        setFound(result);
        setError(null);
      } else {
        setFound(null);
        setError(result.error);
      }
    });
  }, [complete, value]);

  function edit(next: string[]) {
    setCode(next);
    setFound(null);
    setError(null);
  }

  function join() {
    setError(null);
    startJoin(async () => {
      const result = await joinWithInviteCodeAction(value);
      if (result?.error) setError(result.error);
    });
  }

  const org = found?.org;
  const ready = Boolean(org) && !checking;

  return (
    <>
      <div ref={boxes}>
        <CodeBoxes value={code} onChange={edit} invalid={Boolean(error)} autoFocus={!complete} />
      </div>

      {org && ready && (
        <div className="bg-cream border-ink/8 flex items-center gap-3.5 rounded-2xl border px-4 py-3.5">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a stored 64px WebP variant
            <img src={org.logoUrl} alt="" className="size-11 flex-none rounded-xl object-cover" />
          ) : (
            <span className="bg-pine text-cream font-heading grid size-11 flex-none place-items-center rounded-xl text-[20px]">
              {org.name.trim()[0]?.toUpperCase()}
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[16px] font-bold">{org.name}</span>
            <span className="text-ink-soft text-[13px]">
              {org.memberCount} {org.memberCount === 1 ? "member" : "members"} ·{" "}
              {found.alreadyMember ? "you're already a member" : "you'll join as Member"}
            </span>
          </span>
          <span className="bg-leaf text-leaf-ink flex-none rounded-full px-2.5 py-[5px] text-[12px] font-bold">
            ✓ Found
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-destructive m-0 text-[14px]">
          {error}
        </p>
      )}
      {empty && !error && (
        <span className="text-ink-soft text-[14px]">
          Tip: you can paste the whole code into the first box.
        </span>
      )}

      {org && ready && found.alreadyMember ? (
        <Link href={`/app/${org.slug}`} className={pill()}>
          Open {org.name}
        </Link>
      ) : (
        <button
          type="button"
          onClick={join}
          disabled={!ready || joining}
          aria-live="polite"
          className={cn(
            pill(),
            // The design's resting state: sand until the code is complete.
            !ready &&
              "bg-sand text-ink-faint hover:bg-sand hover:text-ink-faint disabled:opacity-100",
          )}
        >
          {joining
            ? "Joining…"
            : ready && org
              ? `Join ${org.name}`
              : complete && checking
                ? "Finding your club…"
                : `Enter all ${code.length} characters`}
        </button>
      )}

      <div className="text-ink-muted flex justify-between gap-4 text-[14px]">
        <Link href="/onboarding/organization" className="text-ink-muted font-semibold">
          Starting a new club instead?
        </Link>
        <button
          type="button"
          onClick={() => {
            edit(emptyCode());
            setTimeout(() => boxes.current?.querySelector("input")?.focus(), 0);
          }}
          className="text-ink-muted cursor-pointer border-none bg-transparent p-0 font-semibold"
        >
          Clear
        </button>
      </div>
    </>
  );
}
