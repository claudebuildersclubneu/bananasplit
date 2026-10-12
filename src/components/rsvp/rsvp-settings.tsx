"use client";

import { EyeOff, ImagePlus, Lock, Mail, MessageSquareText, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { saveRsvpSettings } from "@/app/app/[orgSlug]/calendar/[eventId]/rsvp/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { RSVP_BACKGROUNDS } from "@/lib/rsvp/backgrounds";
import type { RsvpCover } from "@/lib/rsvp/cover";
import { cn } from "@/lib/utils";

import { PagePreview } from "./page-preview";

export interface RsvpSettingsValue {
  locationDetails: string;
  capacity: number | null;
  waitlist: boolean;
  closed: boolean;
  hideLocation: boolean;
  hideGuests: boolean;
  hideCount: boolean;
  background: string;
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card space-y-4 rounded-xl border p-5">
      <div className="space-y-1">
        <h2 className="heading text-base">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

/**
 * The privacy switches, made big on purpose: each is its own tile with a
 * bold label, and the tile lights up when it's on, so what the public page
 * hides is obvious at a glance.
 */
function PrivacyTile({
  id,
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  icon: typeof Lock;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3.5 rounded-xl border-2 p-4 transition-colors",
        checked ? "border-primary bg-primary/6" : "hover:bg-muted/50 border-border",
      )}
    >
      <span
        className={cn(
          "grid size-10 flex-none place-items-center rounded-lg",
          checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block text-base leading-snug font-bold">{label}</span>
        <span className="text-muted-foreground block text-sm leading-relaxed">{description}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-1" />
    </label>
  );
}

export function RsvpSettings({
  orgId,
  orgSlug,
  eventId,
  title,
  location,
  cover,
  initial,
  messaging,
}: {
  orgId: string;
  orgSlug: string;
  eventId: string;
  title: string;
  location: string | null;
  cover: RsvpCover | null;
  initial: RsvpSettingsValue;
  messaging: { email: "org" | "platform"; texts: boolean };
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [capacityText, setCapacityText] = useState(
    initial.capacity ? String(initial.capacity) : "",
  );
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const limited = value.capacity !== null;
  const dirty =
    JSON.stringify(value) !== JSON.stringify(initial) ||
    (limited && capacityText !== String(initial.capacity ?? ""));

  function set<K extends keyof RsvpSettingsValue>(key: K, v: RsvpSettingsValue[K]) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  function save() {
    const capacity = limited ? Number.parseInt(capacityText, 10) : null;
    if (limited && (!Number.isFinite(capacity) || (capacity ?? 0) < 1)) {
      toast({
        title: "Set how many spots",
        description: "Enter a number of 1 or more, or turn off Limit spots.",
      });
      return;
    }
    start(async () => {
      const result = await saveRsvpSettings(orgId, eventId, {
        ...value,
        capacity,
        locationDetails: value.locationDetails.trim() || null,
      });
      if (result.error) {
        toast({ title: "Couldn't save", description: result.error });
        return;
      }
      toast({ title: "RSVP page saved" });
      router.refresh();
    });
  }

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(`/api/orgs/${orgId}/events/${eventId}/cover`, {
        method: "POST",
        body,
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast({
          title: "Couldn't upload the cover",
          description: json.error ?? "Try another image.",
        });
        return;
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeCover() {
    setUploading(true);
    try {
      const response = await fetch(`/api/orgs/${orgId}/events/${eventId}/cover`, {
        method: "DELETE",
      });
      if (!response.ok) toast({ title: "Couldn't remove the cover" });
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="space-y-5">
        <Card
          title="Look"
          description="The square image at the top of the page, and what's behind it."
        >
          <div className="flex flex-wrap items-center gap-4">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element -- a stored WebP variant
              <img
                src={cover.s480}
                alt="Cover"
                className="size-24 rounded-xl border object-cover"
              />
            ) : (
              <span className="bg-muted text-muted-foreground grid size-24 place-items-center rounded-xl border border-dashed">
                <ImagePlus className="size-6" aria-hidden="true" />
              </span>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus aria-hidden="true" />
                  {uploading ? "Uploading…" : cover ? "Change cover" : "Upload cover"}
                </Button>
                {cover && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={uploading}
                    onClick={() => void removeCover()}
                  >
                    <Trash2 aria-hidden="true" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                JPEG, PNG or WebP up to 4 MB. Shown square.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadCover(file);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Background</p>
            <div
              className="grid grid-cols-4 gap-2 sm:grid-cols-8"
              role="radiogroup"
              aria-label="Background"
            >
              {RSVP_BACKGROUNDS.map((b) => {
                const active = value.background === b.id;
                const unavailable = b.id === "cover" && !cover;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={unavailable}
                    title={unavailable ? "Upload a cover first" : b.label}
                    onClick={() => set("background", b.id)}
                    className="group flex flex-col items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span
                      className={cn(
                        "block aspect-square w-full rounded-lg border",
                        b.swatch,
                        active
                          ? "ring-primary ring-2 ring-offset-2 ring-offset-(--card)"
                          : "group-hover:ring-border group-hover:ring-2",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[11px]",
                        active ? "font-semibold" : "text-muted-foreground",
                      )}
                    >
                      {b.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card
          title="Spots"
          description="How many people can come, and what happens when it fills up."
        >
          <div className="space-y-4">
            <SwitchRow
              id="rsvp-limit"
              label="Limit spots"
              description="Off means anyone can sign up."
              checked={limited}
              onChange={(on) => {
                set("capacity", on ? Number.parseInt(capacityText, 10) || 50 : null);
                if (on && !capacityText) setCapacityText("50");
              }}
            />
            {limited && (
              <div className="flex items-center gap-2 ps-0.5">
                <Input
                  id="rsvp-capacity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100000}
                  value={capacityText}
                  onChange={(e) => {
                    setCapacityText(e.target.value);
                    const n = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(n) && n >= 1) set("capacity", n);
                  }}
                  className="w-28"
                  aria-label="Number of spots"
                />
                <span className="text-muted-foreground text-sm">spots</span>
              </div>
            )}
            <SwitchRow
              id="rsvp-waitlist"
              label="Waitlist when full"
              description="New sign-ups wait in line; when a spot opens, the next person gets it and an email."
              checked={value.waitlist}
              onChange={(v) => set("waitlist", v)}
              disabled={!limited}
            />
            <SwitchRow
              id="rsvp-open"
              label="Taking sign-ups"
              description="Turn off to close registration without hiding the page."
              checked={!value.closed}
              onChange={(v) => set("closed", !v)}
            />
          </div>
        </Card>

        <Card
          title="Getting there"
          description="The address comes from the event. Add how to find the room once people are in the building."
        >
          <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm">
            <span className={cn("min-w-0 truncate", !location && "text-muted-foreground")}>
              {location ?? "No location set"}
            </span>
            <Link
              href={`/app/${orgSlug}/calendar/${eventId}?edit=1`}
              className="text-primary shrink-0 text-xs font-medium hover:underline"
            >
              Edit event
            </Link>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rsvp-directions">How to find it</Label>
            <Textarea
              id="rsvp-directions"
              rows={3}
              maxLength={1000}
              value={value.locationDetails}
              onChange={(e) => set("locationDetails", e.target.value)}
              placeholder="Room 204 on the second floor. Take the east elevator; we'll have a sign on the door."
            />
          </div>
        </Card>

        <Card title="Privacy" description="What the public page keeps to itself.">
          <div className="grid gap-3">
            <PrivacyTile
              id="rsvp-hide-location"
              icon={Lock}
              label="Hide the address until people sign up"
              description="The address, directions and map only show to people who registered. Everyone else sees “Location shared after you sign up.”"
              checked={value.hideLocation}
              onChange={(v) => set("hideLocation", v)}
            />
            <PrivacyTile
              id="rsvp-hide-guests"
              icon={Users}
              label="Hide who's going"
              description="Don't list guests' names on the page. Names are always shortened, like “Maya P.”"
              checked={value.hideGuests}
              onChange={(v) => set("hideGuests", v)}
            />
            <PrivacyTile
              id="rsvp-hide-count"
              icon={EyeOff}
              label="Hide how many are going"
              description="No head count or spots-left number on the page (this hides the names too)."
              checked={value.hideCount}
              onChange={(v) => set("hideCount", v)}
            />
          </div>
        </Card>

        {/* Only while there's something to save, pinned to the bottom of the screen. */}
        {dirty && (
          <div className="bg-card sticky bottom-3 flex items-center justify-end gap-3 rounded-xl border p-3 shadow-lg">
            <span className="text-muted-foreground me-auto text-sm">Unsaved changes</span>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                setValue(initial);
                setCapacityText(initial.capacity ? String(initial.capacity) : "");
              }}
            >
              Discard
            </Button>
            <Button disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Preview
          </p>
          <PagePreview cover={cover} background={value.background} title={title} />
        </div>
        <div className="bg-card space-y-3 rounded-xl border p-4 text-sm">
          <p className="font-medium">What guests get</p>
          <p className="text-muted-foreground flex gap-2 text-xs leading-relaxed">
            <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              A confirmation email, then reminders a day and an hour before.{" "}
              {messaging.email === "org"
                ? "Sent from your club's email sender."
                : "Sent as your club via Bananasplit until you connect your own sender in Admin panel › Integrations."}
            </span>
          </p>
          <p className="text-muted-foreground flex gap-2 text-xs leading-relaxed">
            <MessageSquareText className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {messaging.texts
                ? "A text with each reminder, to the number they signed up with."
                : "Text reminders switch on once text messaging is set up for Bananasplit; numbers are collected now."}
            </span>
          </p>
        </div>
      </aside>
    </div>
  );
}
