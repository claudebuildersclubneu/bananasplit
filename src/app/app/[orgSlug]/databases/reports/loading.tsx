import { PageHeader } from "@/components/page-header";
import { ReportSkeleton } from "@/components/reports/report-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

import { DatabasesTabs } from "../databases-tabs";

/** The Reports shell while the page resolves the org and the viewer's reports. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <PageHeader
        title="Reports"
        description={
          <span className="bg-muted inline-block h-4 w-80 max-w-full animate-pulse rounded-md align-middle" />
        }
        actions={
          <>
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="size-7 rounded-lg" />
          </>
        }
        tabs={<DatabasesTabs showReports />}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ReportSkeleton title="Last session" bodyHeight={160} />
        <ReportSkeleton title="Attendance over time" stats={4} className="lg:col-span-2" />
        <ReportSkeleton title="Retention" stats={5} bodyHeight={266} className="lg:col-span-2" />
        <ReportSkeleton title="Session breakdown" bodyHeight={200} />
      </div>
    </div>
  );
}
