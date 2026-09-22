import { AppPage } from "@/components/layout/app-page";
import { ResultsSkeleton } from "@/components/insights/results-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResultsLoading() {
  return (
    <AppPage>
      <Skeleton className="h-5 w-20" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
      <ResultsSkeleton />
    </AppPage>
  );
}
