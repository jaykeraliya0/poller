import { SearchXIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { ButtonLink } from "@/components/shared/button-link";
import { EmptyState } from "@/components/shared/empty-state";

export default function NotFound() {
  return (
    <PageContainer className="flex flex-1 items-center py-12">
      <EmptyState
        icon={SearchXIcon}
        title="Page not found"
        description="This poll may have been deleted, or the link is mistyped."
      >
        <ButtonLink href="/" size="lg" className="h-11">
          Go home
        </ButtonLink>
      </EmptyState>
    </PageContainer>
  );
}
