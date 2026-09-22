import { AppPage } from "@/components/layout/app-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <AppPage role="status" aria-busy="true" aria-label="Loading your polls">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="flex justify-between gap-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="hidden h-10 w-72 sm:block" />
      </div>
      <div className="panel divide-y">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </AppPage>
  );
}
