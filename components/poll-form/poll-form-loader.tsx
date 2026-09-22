"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { PollFormProps } from "./poll-form";

function PollFormSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6" role="status" aria-busy="true" aria-label="Loading form">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56 rounded-[14px]" />
        <Skeleton className="h-72 rounded-[14px]" />
      </div>
      <Skeleton className="hidden h-80 rounded-[14px] lg:block" />
    </div>
  );
}

// Client-only: defaults like the browser's time zone, "tomorrow" and local
// deadline times only exist in the browser; server-rendering them would
// mismatch on hydration.
const PollForm = dynamic(() => import("./poll-form").then((module) => module.PollForm), {
  ssr: false,
  loading: PollFormSkeleton,
});

export function PollFormLoader(props: PollFormProps) {
  return <PollForm {...props} />;
}
