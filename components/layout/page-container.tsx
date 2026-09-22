import { cn } from "@/lib/utils";

/** Centered, gutter-padded content column shared by every page. */
export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-3xl px-4 sm:px-6", className)} {...props} />;
}
