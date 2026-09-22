import { PageContainer } from "@/components/layout/page-container";
import { ResultsSkeleton } from "@/components/insights/results-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResultsLoading() {
  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
      <ResultsSkeleton />
    </PageContainer>
  );
}
