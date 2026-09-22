"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcwIcon } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { PageContainer } from "@/components/layout/page-container";
import { ButtonLink } from "@/components/shared/button-link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <header className="pt-[env(safe-area-inset-top)]">
        <PageContainer className="flex h-16 items-center">
          <Link href="/" className="-my-2 flex min-h-11 items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
            <Logo />
          </Link>
        </PageContainer>
      </header>
      <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 py-16 outline-none">
        <div className="flex max-w-md flex-col items-center gap-5 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">We couldn&apos;t load this page. Your votes and polls are safe, so try again.</p>
            {error.digest && <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={() => retry()}>
              <RotateCcwIcon data-icon="inline-start" />
              Try again
            </Button>
            <ButtonLink href="/" variant="outline" size="lg">
              Go home
            </ButtonLink>
          </div>
        </div>
      </main>
    </>
  );
}
