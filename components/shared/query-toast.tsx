"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const matched = searchParams.get(param) === value;

  useEffect(() => {
    if (!matched) return;
    toast.success(message);
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [matched, message, param, pathname, router, searchParams]);

  return null;
}
