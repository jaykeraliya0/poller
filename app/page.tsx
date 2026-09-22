import { ButtonLink } from "@/components/shared/button-link";
import { PageContainer } from "@/components/layout/page-container";

// Placeholder landing page; template cards arrive in Phase 3.
export default function Home() {
  return (
    <PageContainer className="flex flex-1 flex-col items-start justify-center gap-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Decide together, faster.
      </h1>
      <p className="max-w-prose text-muted-foreground text-pretty">
        Create a poll in a minute, share the link, and see what your group really thinks, with
        clear winners, response rates and insights.
      </p>
      <ButtonLink href="/polls/new" size="lg">
        Create a poll
      </ButtonLink>
    </PageContainer>
  );
}
