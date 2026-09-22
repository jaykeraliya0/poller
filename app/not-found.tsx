import { SiteHeader } from "@/components/layout/site-header";
import { NotFoundContent } from "@/components/shared/not-found-content";

/** Unknown URLs render outside every route group, so this brings its own chrome. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <NotFoundContent />
      </main>
    </>
  );
}
