"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { PollFormProps } from "./poll-form";

export function PollFormSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label="Loading form">
      <Skeleton className="h-52 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl" />
      <Skeleton className="h-96 rounded-3xl" />
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
