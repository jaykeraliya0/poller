import type { Metadata } from "next";
import { AppPage } from "@/components/layout/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { PollFormLoader } from "@/components/poll-form/poll-form-loader";
import { TemplateGrid } from "@/components/poll/template-card";
import { requirePageUser } from "@/lib/auth/guards";
import { POLL_TEMPLATES, getTemplate } from "@/lib/poll/templates";

export const metadata: Metadata = { title: "New poll" };

export default async function NewPollPage({ searchParams }: PageProps<"/polls/new">) {
  const { template: templateId } = await searchParams;
  await requirePageUser(templateId ? `/polls/new?template=${templateId}` : "/polls/new");
  const template = getTemplate(templateId);

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
