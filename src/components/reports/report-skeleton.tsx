import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Card-shaped placeholder with roughly the finished card's height and layout. */
export function ReportSkeleton({
  title,
  bodyHeight = 240,
  stats = 0,
  className,
}: {
  title: string;
  bodyHeight?: number;
  stats?: number;
  className?: string;
}) {
  return (
    <Card
      className={cn("min-w-0 flex-1", className)}
      aria-busy="true"
      aria-label={`${title} loading`}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Skeleton className="h-4 w-2/3 rounded-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {stats > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: stats }).map((_, i) => (
              <Skeleton key={i} className="rounded-tile h-[92px]" />
            ))}
          </div>
        ) : null}
        <Skeleton className="rounded-tile w-full" style={{ height: bodyHeight }} />
      </CardContent>
    </Card>
  );
}
