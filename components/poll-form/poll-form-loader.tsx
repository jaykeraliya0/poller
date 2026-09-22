"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { PollTemplateDefinition } from "@/lib/poll/templates";

export function PollFormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading form">
      <Skeleton className="h-52 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl" />
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

// Client-only: defaults like the browser's time zone and "tomorrow" only exist
// in the browser, and rendering them on the server would mismatch on hydration.
const PollForm = dynamic(() => import("./poll-form").then((module) => module.PollForm), {
  ssr: false,
  loading: PollFormSkeleton,
});

export function PollFormLoader({ template }: { template: PollTemplateDefinition }) {
  return <PollForm template={template} />;
}
