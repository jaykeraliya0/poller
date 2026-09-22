import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

/** Fallback for signed-in pages without their own skeleton (new, edit, settings). */
export default function AppLoading() {
  return (
    <PageContainer className="flex flex-col gap-4 py-8" role="status" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-52 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl" />
    </PageContainer>
  );
}
