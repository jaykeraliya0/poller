import Link from "next/link";
import {
  CalendarDaysIcon,
  ListOrderedIcon,
  MapPinIcon,
  PresentationIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import type { PollTemplateDefinition, TemplateIcon } from "@/lib/poll/templates";

const ICONS: Record<TemplateIcon, LucideIcon> = {
  calendar: CalendarDaysIcon,
  "list-ordered": ListOrderedIcon,
  "map-pin": MapPinIcon,
  presentation: PresentationIcon,
  sparkles: SparklesIcon,
};

export function TemplateCard({ template }: { template: PollTemplateDefinition }) {
  const Icon = ICONS[template.icon];
  return (
    <Link
      href={`/polls/new?template=${template.id}`}
      className="group flex items-start gap-4 rounded-3xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-medium group-hover:text-primary">{template.name}</span>
        <span className="text-sm text-muted-foreground">{template.tagline}</span>
      </span>
    </Link>
  );
}

export function TemplateGrid({ templates }: { templates: PollTemplateDefinition[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {templates.map((template) => (
        <li key={template.id}>
          <TemplateCard template={template} />
        </li>
      ))}
    </ul>
  );
}
