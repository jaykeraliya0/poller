import { LockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marks a poll only invited people can open. Sits next to the status pill. */
export function PrivatePill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border bg-panel px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <LockIcon className="size-3" aria-hidden />
      Private
    </span>
  );
}
