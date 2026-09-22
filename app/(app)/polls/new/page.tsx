import type { Metadata } from "next";
import { MailWarningIcon } from "lucide-react";
import { ResendVerificationButton } from "@/components/account/resend-verification-button";
import { AppPage } from "@/components/layout/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { EmptyState } from "@/components/shared/empty-state";
import { PollFormLoader } from "@/components/poll-form/poll-form-loader";
import { TemplateGrid } from "@/components/poll/template-card";
import { requirePageUser } from "@/lib/auth/guards";
import { POLL_TEMPLATES, getTemplate } from "@/lib/poll/templates";

export const metadata: Metadata = { title: "New poll" };

export default async function NewPollPage({ searchParams }: PageProps<"/polls/new">) {
  const { template: templateId } = await searchParams;
  const user = await requirePageUser(templateId ? `/polls/new?template=${templateId}` : "/polls/new");
  const template = getTemplate(templateId);

  // createPollAction enforces this too; here it saves filling in a form that can't be submitted.
  if (!user.emailVerified) {
    return (
      <AppPage>
        <PageHeader title="New poll" />
        <EmptyState
          icon={MailWarningIcon}
          title="Confirm your email to create polls"
          description={
            <>
              Follow the link we sent to <strong className="font-medium text-foreground">{user.email}</strong>, then come
              back here. You can still vote on other people&apos;s polls in the meantime.
            </>
          }
        >
          <ResendVerificationButton email={user.email} size="lg" />
        </EmptyState>
      </AppPage>
    );
  }

  if (!template) {
    return (
      <AppPage>
        <PageHeader title="What are you deciding?" description="Start from a template. You can change everything before you share it." />
        <TemplateGrid templates={POLL_TEMPLATES} />
      </AppPage>
    );
  }

  return (
    <AppPage>
      <PageHeader above={<BackLink href="/polls/new">Templates</BackLink>} title={template.name} description={template.tagline} />
      {/* Keyed so switching template via the URL starts a fresh draft. */}
      <PollFormLoader key={template.id} mode="create" template={template} />
    </AppPage>
  );
}
