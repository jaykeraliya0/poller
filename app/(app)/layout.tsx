import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { AppNav } from "@/components/layout/app-nav";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { ButtonLink } from "@/components/shared/button-link";
import { getCurrentUser } from "@/lib/auth/guards";

/**
 * Signed-in shell: a sidebar on wide screens, a compact top bar on phones.
 * Pages still guard themselves (requirePageUser) so the redirect keeps `next`.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-sidebar px-3 py-5 lg:flex">
        <Link href="/dashboard" className="flex min-h-9 items-center rounded-lg px-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
          <Logo />
        </Link>
        <ButtonLink href="/polls/new" size="lg" className="justify-start">
          <PlusIcon data-icon="inline-start" aria-hidden />
          New poll
        </ButtonLink>
        <AppNav />
        {user && (
          <div className="mt-auto">
            <UserMenu name={user.name} email={user.email} variant="row" />
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/dashboard" className="-my-2 flex min-h-11 items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              <ButtonLink href="/polls/new" size="lg">
                <PlusIcon data-icon="inline-start" aria-hidden />
                New poll
              </ButtonLink>
              {user && <UserMenu name={user.name} email={user.email} />}
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col pb-[env(safe-area-inset-bottom)] outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
