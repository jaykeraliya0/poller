import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-11 rounded-2xl" />
      <Skeleton className="h-11 rounded-2xl" />
      <Skeleton className="h-11 rounded-2xl" />
    </div>
  );
}
