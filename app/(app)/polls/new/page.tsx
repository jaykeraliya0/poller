import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
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
      <PageContainer className="py-8">
        <h1 className="text-2xl font-semibold tracking-tight">What are you deciding?</h1>
        <p className="mt-2 mb-6 text-muted-foreground">Start from a template. You can change everything.</p>
        <TemplateGrid templates={POLL_TEMPLATES} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-6">
      <Link
        href="/polls/new"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Templates
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{template.name}</h1>
      {/* Keyed so switching template via the URL starts a fresh draft. */}
      <PollFormLoader key={template.id} template={template} />
    </PageContainer>
  );
}
