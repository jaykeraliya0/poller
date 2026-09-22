import Link from "next/link";
import { ButtonLink } from "@/components/shared/button-link";
import { getCurrentUser } from "@/lib/auth/guards";
import { Logo } from "./logo";
import { PageContainer } from "./page-container";
import { UserMenu } from "./user-menu";

/** Top bar for public pages: the landing page and everything a voter sees. */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-backdrop-filter:bg-background/70">
      <PageContainer className="flex h-16 items-center justify-between gap-4">
        <Link href={user ? "/dashboard" : "/"} className="-my-2 flex min-h-11 items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1.5">
          {user ? (
            <>
              <ButtonLink href="/dashboard" variant="ghost" size="lg">
                My polls
              </ButtonLink>
              <UserMenu name={user.name} email={user.email} />
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="lg">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="lg">
                Get started
              </ButtonLink>
            </>
          )}
        </nav>
      </PageContainer>
    </header>
  );
}
