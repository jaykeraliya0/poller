import { getCurrentUser } from "@/lib/auth/guards";
import { AppShell } from "./app-shell";
import { SiteHeader } from "./site-header";

/**
 * Chrome for pages anyone can open but a signed-in user often reaches from
 * their own dashboard: poll links and stray URLs. Guests get the public
 * header; a signed-in visitor keeps the sidebar they navigated from.
 * The marketing landing page deliberately stays on SiteHeader either way.
 */
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) return <AppShell>{children}</AppShell>;

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col pb-[env(safe-area-inset-bottom)] outline-none">
        {children}
      </main>
    </>
  );
}
