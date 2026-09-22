"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type QueryToastProps = { param: string; value: string; message: string };

/**
 * Shows a one-off toast when `?param=value` is present (e.g. after a redirect),
 * then removes the param so a refresh doesn't show it again.
 */
export function QueryToast(props: QueryToastProps) {
  // useSearchParams needs a Suspense boundary so the rest of the page can still prerender.
  return (
    <Suspense fallback={null}>
      <QueryToastEffect {...props} />
    </Suspense>
  );
}

function QueryToastEffect({ param, value, message }: QueryToastProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const matched = searchParams.get(param) === value;

  useEffect(() => {
    if (!matched) return;
    toast.success(message);
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    // Only the URL changes (native history, synced with useSearchParams); the page isn't refetched.
    window.history.replaceState(null, "", next.size ? `${pathname}?${next}` : pathname);
  }, [matched, message, param, pathname, searchParams]);

  return null;
}
