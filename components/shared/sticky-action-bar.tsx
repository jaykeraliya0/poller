import { cn } from "@/lib/utils";

/**
 * Primary actions pinned to the bottom of the screen on phones (thumb reach),
 * inline on larger screens. Pages using it need bottom padding on mobile.
 */
export function StickyActionBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t bg-panel/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(21_24_35/0.06)] backdrop-blur",
        "sm:static sm:z-auto sm:border-x-0 sm:border-b-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:shadow-none sm:backdrop-blur-none",
        className,
      )}
      {...props}
    />
  );
}

/** Spacer so content isn't hidden behind the fixed bar on phones. */
export const STICKY_BAR_PADDING = "pb-28 sm:pb-8";
