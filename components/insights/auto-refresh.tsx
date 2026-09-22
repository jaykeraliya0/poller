"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const AUTO_REFRESH_MS = 15_000;

/**
 * Re-renders the server page every 15s while the tab is visible, and right
 * away when the tab becomes visible again. No SSE: polling is simpler and
 * cheap at this scale.
 */
export function AutoRefresh({ intervalMs = AUTO_REFRESH_MS }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [intervalMs, router]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-open/60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-open" />
      </span>
      Live
    </span>
  );
}
