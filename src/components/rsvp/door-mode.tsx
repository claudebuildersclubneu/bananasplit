"use client";

import { Camera, Check, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";

import { setGuestCheckedIn } from "@/app/app/[orgSlug]/calendar/[eventId]/rsvp/actions";
import { avatarTone, doorScan, initials } from "@/lib/rsvp/format";
import { formatCents } from "@/lib/rsvp/pay";
import { cn } from "@/lib/utils";

/**
 * Door mode: the check-in screen a host keeps open at the entrance, made
 * for a phone. Search a name and tap, or scan guests' QR tickets with the
 * camera (where the browser can read QR codes; elsewhere the phone's own
 * camera app opens each ticket's check-in screen). Several hosts can run
 * doors at once: the list refreshes every 15 seconds.
 */

export interface DoorGuest {
  id: string;
  name: string;
  status: "GOING" | "WAITLIST";
  checkedIn: boolean;
  ticketCode: string;
  /** Split the cost: owes (cents), or null when paid or free. */
  owes: number | null;
  /** They said they paid; the host hasn't confirmed it yet. */
  saysPaid: boolean;
}

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

type Flash = { tone: "ok" | "warn" | "bad"; title: string; detail?: string };

const REFRESH_MS = 15_000;

export function DoorMode({
  orgId,
  eventId,
  title,
  when,
  guests,
  backHref,
}: {
  orgId: string;
  eventId: string;
  title: string;
  when: string;
  guests: DoorGuest[];
  backHref: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  // A tap shows at once; the refresh after the save brings the server's list.
  const [list, setOptimistic] = useOptimistic(
    guests,
    (state, change: { id: string; checkedIn: boolean }) =>
      state.map((g) => (g.id === change.id ? { ...g, checkedIn: change.checkedIn } : g)),
  );
  const [flash, setFlash] = useState<Flash | null>(null);
  const [scanning, setScanning] = useState(false);
  const [, start] = useTransition();
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const going = list.filter((g) => g.status === "GOING");
  const inCount = going.filter((g) => g.checkedIn).length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((g) => (q ? g.name.toLowerCase().includes(q) : showAll || !g.checkedIn))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [list, query, showAll]);

  function say(next: Flash) {
    setFlash(next);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 3200);
  }

  function checkIn(g: DoorGuest, value: boolean, method: "QR" | "MANUAL" = "MANUAL") {
    start(async () => {
      setOptimistic({ id: g.id, checkedIn: value });
      const result = await setGuestCheckedIn(orgId, eventId, g.id, value, method);
      if (result.error) {
        say({ tone: "bad", title: "That didn't save", detail: result.error });
        return;
      }
      if (value) {
        say(
          result.already
            ? { tone: "warn", title: `${g.name} was already in` }
            : {
                tone: g.owes !== null ? "warn" : "ok",
                title: `${g.name} is in`,
                detail:
                  g.owes === null
                    ? undefined
                    : g.saysPaid
                      ? `Says they paid ${formatCents(g.owes)}: check it`
                      : `Still owes ${formatCents(g.owes)}`,
              },
        );
      }
      router.refresh();
    });
  }

  function onScan(raw: string) {
    const scan = doorScan(list, raw);
    if (scan.kind === "unknown") {
      say({ tone: "bad", title: "Not a ticket for this event" });
    } else if (scan.kind === "already") {
      say({ tone: "warn", title: `${scan.guest.name} is already in` });
    } else if (scan.kind === "waitlist") {
      // Not checked in: the host decides, from the list.
      say({
        tone: "warn",
        title: `${scan.guest.name} is on the waitlist`,
        detail: "To let them in anyway, close the scanner and tap Check in on their name.",
      });
    } else {
      checkIn(scan.guest, true, "QR");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={backHref} className="text-muted-foreground text-sm hover:underline">
            ← Back to the guest list
          </Link>
          <h1 className="heading mt-1 truncate text-2xl">{title}</h1>
          <p className="text-muted-foreground text-sm">{when}</p>
        </div>
        <div className="bg-card flex-none rounded-xl border px-4 py-2 text-center">
          <p className="heading text-2xl tabular-nums">
            {inCount}
            <span className="text-muted-foreground text-base">/{going.length}</span>
          </p>
          <p className="text-muted-foreground text-xs">in</p>
        </div>
      </div>

      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-[width]"
          style={{ width: `${going.length ? (inCount / going.length) * 100 : 0}%` }}
        />
      </div>

      <div className="flex gap-2">
        <label className="bg-card focus-within:ring-ring flex h-14 min-w-0 flex-1 items-center gap-3 rounded-xl border px-4 focus-within:ring-2">
          <Search className="text-muted-foreground size-5" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a guest"
            aria-label="Find a guest by name"
            className="min-w-0 flex-1 bg-transparent text-lg outline-none"
          />
          {query && (
            <button type="button" aria-label="Clear" onClick={() => setQuery("")}>
              <X className="text-muted-foreground size-5" aria-hidden="true" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="bg-primary text-primary-foreground flex h-14 items-center gap-2 rounded-xl px-5 font-semibold"
        >
          <Camera className="size-5" aria-hidden="true" />
          Scan
        </button>
      </div>

      {!query && (
        <div className="flex gap-1.5 text-sm">
          {[
            [false, `Not in yet (${going.length - inCount})`],
            [true, `Everyone (${list.length})`],
          ].map(([value, label]) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={showAll === value}
              onClick={() => setShowAll(value as boolean)}
              className={cn(
                "rounded-full border px-3 py-1.5 font-medium",
                showAll === value ? "bg-foreground text-background" : "bg-card",
              )}
            >
              {label as string}
            </button>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {shown.map((g) => {
          const checked = g.checkedIn;
          return (
            <li
              key={g.id}
              className={cn(
                "bg-card flex items-center gap-3 rounded-xl border p-3",
                checked && "opacity-70",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-11 flex-none place-items-center rounded-full text-sm font-bold",
                  avatarTone(g.name),
                )}
              >
                {initials(g.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">{g.name}</span>
                <span className="text-muted-foreground block text-xs">
                  {[
                    g.status === "WAITLIST" ? "Waitlist" : null,
                    g.owes === null
                      ? null
                      : g.saysPaid
                        ? `Says they paid ${formatCents(g.owes)}`
                        : `Owes ${formatCents(g.owes)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || (checked ? "Checked in" : "Going")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => checkIn(g, !checked)}
                className={cn(
                  "flex h-12 min-w-28 items-center justify-center gap-1.5 rounded-xl px-4 text-base font-semibold",
                  checked ? "bg-success/15 text-success" : "bg-primary text-primary-foreground",
                )}
                aria-label={checked ? `Undo ${g.name}'s check-in` : `Check in ${g.name}`}
              >
                {checked ? (
                  <>
                    <Check className="size-5" aria-hidden="true" /> In
                  </>
                ) : (
                  "Check in"
                )}
              </button>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="text-muted-foreground py-8 text-center text-sm">
            {query
              ? "Nobody by that name. Add them from the guest list."
              : going.length === 0
                ? "Nobody is going yet."
                : "Everyone's in. 🎉"}
          </li>
        )}
      </ul>

      {flash && (
        <div
          role="status"
          className={cn(
            "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl px-5 py-4 shadow-lg",
            flash.tone === "ok" && "bg-success text-white",
            flash.tone === "warn" && "bg-warning text-black",
            flash.tone === "bad" && "bg-destructive text-white",
          )}
        >
          <p className="text-lg font-bold">{flash.title}</p>
          {flash.detail && <p className="text-sm opacity-90">{flash.detail}</p>}
        </div>
      )}

      {scanning && <Scanner onClose={() => setScanning(false)} onScan={onScan} />}
    </div>
  );
}

/**
 * The camera, reading QR codes with the browser's BarcodeDetector. The
 * same ticket is ignored for a few seconds after a read, so holding a phone
 * up doesn't check someone in twice.
 */
const NO_DETECTOR =
  "This browser can't read QR codes. Open your phone's camera app and point it at a ticket instead: it opens that guest's check-in screen for you.";

function barcodeDetector(): BarcodeDetectorCtor | undefined {
  return (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
}

function Scanner({ onClose, onScan }: { onClose: () => void; onScan: (raw: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Opened from a tap, so this only ever runs in the browser.
  const [problem, setProblem] = useState<string | null>(() =>
    barcodeDetector() ? null : NO_DETECTOR,
  );
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const Detector = barcodeDetector();
    if (!Detector) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const recent = new Map<string, number>();
    const detector = new Detector({ formats: ["qr_code"] });

    async function tick() {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          const now = Date.now();
          for (const c of codes) {
            if ((recent.get(c.rawValue) ?? 0) > now) continue;
            recent.set(c.rawValue, now + 4000);
            onScanRef.current(c.rawValue);
          }
        } catch {
          // A frame it couldn't read; try the next one.
        }
      }
      timer = setTimeout(() => void tick(), 250);
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
        void tick();
      })
      .catch(() =>
        setProblem("Bananasplit needs the camera to scan tickets. Allow it in your browser."),
      );

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-black/90"
      role="dialog"
      aria-label="Scan tickets"
    >
      <div className="flex items-center justify-between p-4 text-white">
        <p className="font-semibold">Point at a guest&apos;s ticket</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold"
        >
          Done
        </button>
      </div>
      {problem ? (
        <p className="mx-auto max-w-sm p-6 text-center text-white/90">{problem}</p>
      ) : (
        <div className="relative flex flex-1 items-center justify-center">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          <span
            aria-hidden="true"
            className="absolute size-64 rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
          />
        </div>
      )}
    </div>
  );
}
