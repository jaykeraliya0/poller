import { cn } from "@/lib/utils";

/** Gutter-padded content column for public pages; wide enough to use the screen. */
export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8", className)} {...props} />;
}
