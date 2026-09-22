import Link from "next/link";
import { ChartColumnBigIcon, PlusIcon } from "lucide-react";
import { ButtonLink } from "@/components/shared/button-link";
import { getCurrentUser } from "@/lib/auth/guards";
import { PageContainer } from "./page-container";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur supports-backdrop-filter:bg-background/60">
      <PageContainer className="flex h-14 items-center justify-between gap-4">
        <Link href={user ? "/dashboard" : "/"} className="-my-2 flex min-h-11 items-center gap-2 font-semibold tracking-tight">
          <ChartColumnBigIcon className="size-5 text-primary" aria-hidden />
          Poller
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <ButtonLink href="/polls/new" size="lg" className="h-11">
                <PlusIcon data-icon="inline-start" aria-hidden />
                New poll
              </ButtonLink>
              <UserMenu name={user.name} email={user.email} />
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="lg" className="h-11">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="lg" className="h-11">
                Get started
              </ButtonLink>
            </>
          )}
        </nav>
      </PageContainer>
    </header>
  );
}
