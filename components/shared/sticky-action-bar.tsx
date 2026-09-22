import { cn } from "@/lib/utils";

/**
 * Primary actions pinned to the bottom of the screen on phones (thumb reach),
 * inline on larger screens. Pages using it need bottom padding on mobile.
 */
export function StickyActionBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur",
        "sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none",
        className,
      )}
      {...props}
    />
  );
}

/** Spacer so content isn't hidden behind the fixed bar on phones. */
export const STICKY_BAR_PADDING = "pb-28 sm:pb-8";
