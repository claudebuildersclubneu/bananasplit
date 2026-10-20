import { PageHeader } from "@/components/page-header";
import { ReportSkeleton } from "@/components/reports/report-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

import { DatabasesTabs } from "../databases-tabs";

/** The Reports shell while the page resolves the org and the viewer's reports. */
export default function Loading() {
  return (
    <div className="space-y-7.5" aria-busy="true">
      <PageHeader
        title="Reports"
        description={
          <span className="bg-muted inline-block h-4 w-80 max-w-full animate-pulse rounded-full align-middle" />
        }
        actions={
          <>
            <Skeleton className="h-10 w-56 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
          </>
        }
        tabs={<DatabasesTabs showReports />}
      />
      <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-3">
        <ReportSkeleton title="Last session" bodyHeight={160} />
        <ReportSkeleton title="Attendance over time" stats={4} className="lg:col-span-2" />
        <ReportSkeleton title="Retention" stats={5} bodyHeight={266} className="lg:col-span-2" />
        <ReportSkeleton title="Session breakdown" bodyHeight={200} />
      </div>
    </div>
  );
}
