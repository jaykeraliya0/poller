import { Skeleton } from "@/components/ui/skeleton";

export function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Loading results">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="panel flex flex-col gap-2 p-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-11" style={{ opacity: 1 - index * 0.15 }} />
          ))}
        </div>
        <Skeleton className="h-72 rounded-[14px]" />
      </div>
    </div>
  );
}
