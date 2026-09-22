import { SiteHeader } from "@/components/layout/site-header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col pb-[env(safe-area-inset-bottom)] outline-none">
        {children}
      </main>
    </>
  );
}
