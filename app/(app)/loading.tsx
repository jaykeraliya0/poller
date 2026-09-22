import { AppPage } from "@/components/layout/app-page";
import { Skeleton } from "@/components/ui/skeleton";

/** Fallback for signed-in pages without their own skeleton (new, edit, settings). */
export default function AppLoading() {
  return (
    <AppPage role="status" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-96 rounded-[14px]" />
        <Skeleton className="h-64 rounded-[14px]" />
      </div>
    </AppPage>
  );
}
