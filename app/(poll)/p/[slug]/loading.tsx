import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function VoteLoading() {
  return (
    <PageContainer className="flex flex-col gap-7 py-7 lg:py-10" role="status" aria-busy="true" aria-label="Loading poll">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-11 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20.5rem]">
        <div className="panel flex flex-col gap-2 p-6">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-13" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-[14px]" />
      </div>
    </PageContainer>
  );
}
