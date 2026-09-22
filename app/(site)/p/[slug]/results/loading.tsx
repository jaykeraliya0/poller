import { PageContainer } from "@/components/layout/page-container";
import { ResultsSkeleton } from "@/components/insights/results-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResultsLoading() {
  return (
    <PageContainer className="flex flex-col gap-7 py-7 lg:py-10">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-11 w-3/4" />
      </div>
      <ResultsSkeleton />
    </PageContainer>
  );
}
