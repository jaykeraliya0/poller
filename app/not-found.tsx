import { SiteShell } from "@/components/layout/site-shell";
import { NotFoundContent } from "@/components/shared/not-found-content";

/** Unknown URLs render outside every route group, so this brings its own chrome. */
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundContent />
    </SiteShell>
  );
}
