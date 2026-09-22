import { PageContainer } from "@/components/layout/page-container";
import { TemplateGrid } from "@/components/poll/template-card";
import { ButtonLink } from "@/components/shared/button-link";
import { QueryToast } from "@/components/shared/query-toast";
import { POLL_TEMPLATES } from "@/lib/poll/templates";

export default function Home() {
  return (
    <PageContainer className="flex flex-col gap-10 py-12 sm:py-16">
      <QueryToast param="account" value="deleted" message="Your account and polls were deleted" />
      <section className="flex flex-col items-start gap-5">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Decide together, faster.
        </h1>
        <p className="max-w-prose text-muted-foreground text-pretty">
          Create a poll in a minute, share the link, and see what your group really thinks, with
          clear winners, response rates and insights like &ldquo;Fri 6pm works for 8 of 10 people&rdquo;.
        </p>
        <ButtonLink href="/polls/new" size="lg" className="h-11">
          Create a poll
        </ButtonLink>
      </section>

      <section aria-labelledby="templates-heading" className="flex flex-col gap-4">
        <h2 id="templates-heading" className="text-lg font-semibold">
          Start from a template
        </h2>
        <TemplateGrid templates={POLL_TEMPLATES} />
      </section>
    </PageContainer>
  );
}
