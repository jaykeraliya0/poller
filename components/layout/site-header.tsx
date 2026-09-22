import Link from "next/link";
import { ChartColumnBigIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "./page-container";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur supports-backdrop-filter:bg-background/60">
      <PageContainer className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <ChartColumnBigIcon className="size-5 text-primary" aria-hidden />
          Poller
        </Link>
        <nav className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link href="/polls/new" />} size="lg">
            <PlusIcon data-icon="inline-start" aria-hidden />
            New poll
          </Button>
        </nav>
      </PageContainer>
    </header>
  );
}
