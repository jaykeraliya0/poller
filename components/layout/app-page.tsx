import { cn } from "@/lib/utils";

/** Content column inside the signed-in shell. */
export function AppPage({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-10 lg:py-9", className)}
      {...props}
    />
  );
}
