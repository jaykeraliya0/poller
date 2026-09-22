import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small "‹ Back" link with a full 44px-tall tap target. */
export function BackLink({ className, children, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "-my-2 -ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-lg pr-2 pl-1 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/35",
        className,
      )}
      {...props}
    >
      <ChevronLeftIcon className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
