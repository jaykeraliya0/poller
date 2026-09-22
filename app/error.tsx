"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { ButtonLink } from "@/components/shared/button-link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer className="flex flex-1 items-center py-12">
      <EmptyState
        icon={TriangleAlertIcon}
        level={1}
        title="Something went wrong"
        description={
          <>
            We couldn&apos;t load this page. Your votes and polls are safe, so try again.
            {error.digest && <span className="mt-2 block text-xs">Reference: {error.digest}</span>}
          </>
        }
      >
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="lg" className="h-11" onClick={() => retry()}>
            <RotateCcwIcon data-icon="inline-start" />
            Try again
          </Button>
          <ButtonLink href="/" variant="outline" size="lg" className="h-11">
            Go home
          </ButtonLink>
        </div>
      </EmptyState>
    </PageContainer>
  );
}
