import { cellKey, DAY_LABELS } from "@/lib/availability";
import { cn } from "@/lib/utils";

/**
 * "This week" on the profile sheet: a member's shared busy hours folded
 * into three bands a day (morning 8-12, afternoon 12-5, evening 5-11),
 * shaded by how much of the band is busy. Busy or free only, never why.
 */

export const BANDS = [
  { label: "AM", long: "Morning", from: 8, to: 12 },
  { label: "PM", long: "Afternoon", from: 12, to: 17 },
  { label: "Eve", long: "Evening", from: 17, to: 23 },
] as const;

/** 0 (free) to 1 (busy the whole band). */
export function bandShare(busy: ReadonlySet<string>, day: number, from: number, to: number): number {
  let n = 0;
  for (let h = from; h < to; h++) if (busy.has(cellKey(day, h))) n++;
  return n / (to - from);
}

export function WeekStrip({ busy, className }: { busy: readonly string[]; className?: string }) {
  const set = new Set(busy);
  const busyHours = busy.length;
  return (
    <div
      role="img"
      aria-label={
        busyHours === 0
          ? "Free all week, as far as they've shared"
          : `Busy ${busyHours} hour${busyHours === 1 ? "" : "s"} in a typical week`
      }
      className={cn("grid items-center gap-1 text-xs font-semibold", className)}
      style={{ gridTemplateColumns: "34px repeat(7, minmax(0, 1fr))" }}
    >
      <span />
      {DAY_LABELS.map((d) => (
        <span key={d} className="text-muted-foreground text-center">
          {d}
        </span>
      ))}
      {BANDS.map((band) => (
        <BandRow key={band.label} band={band} set={set} />
      ))}
    </div>
  );
}

function BandRow({ band, set }: { band: (typeof BANDS)[number]; set: Set<string> }) {
  return (
    <>
      <span className="text-muted-foreground" title={band.long}>
        {band.label}
      </span>
      {DAY_LABELS.map((d, day) => {
        const share = bandShare(set, day, band.from, band.to);
        return (
          <i
            key={d}
            title={`${d} ${band.long.toLowerCase()}: ${share === 0 ? "free" : share === 1 ? "busy" : "partly busy"}`}
            className={cn(
              "block h-3 rounded-[4px]",
              share === 0
                ? "bg-muted"
                : share < 1
                  ? "bg-[color-mix(in_oklab,var(--chart-2)_38%,var(--muted))]"
                  : "bg-[color-mix(in_oklab,var(--chart-2)_72%,var(--muted))]",
            )}
          />
        );
      })}
    </>
  );
}
