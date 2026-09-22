import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Styled native <select>: best on phones (OS picker) and fine for long lists
 * like time zones, where a custom listbox would be heavy.
 */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-11 w-full min-w-0 appearance-none rounded-2xl border border-transparent bg-input/50 py-1 pr-9 pl-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 disabled:opacity-50 md:text-sm"
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}
