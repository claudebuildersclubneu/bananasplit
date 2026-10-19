import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic loading placeholder, shaped like a real page (a title, the stat
 * strip, a card of rows) with matching corners. Used by route loading.tsx files.
 */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-7" aria-hidden="true">
      <div className="space-y-3">
        <Skeleton className="h-10 w-56 rounded-full" />
        <Skeleton className="h-4 w-72 rounded-full" />
      </div>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5">
            <Skeleton className="size-13 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-card space-y-2 p-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 px-3 py-3">
            <Skeleton className="size-[22px] rounded-full" />
            <Skeleton className="h-4 flex-1 rounded-full" style={{ maxWidth: `${88 - i * 9}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
