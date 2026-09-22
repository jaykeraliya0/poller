import Link from "next/link";
import {
  CalendarDaysIcon,
  ListOrderedIcon,
  MapPinIcon,
  PlusIcon,
  PresentationIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import type { PollTemplateDefinition, TemplateIcon } from "@/lib/poll/templates";
import { cn } from "@/lib/utils";
import { getPollType } from "@/poll-types/registry";

const ICONS: Record<TemplateIcon, LucideIcon> = {
  calendar: CalendarDaysIcon,
  "list-ordered": ListOrderedIcon,
  "map-pin": MapPinIcon,
  presentation: PresentationIcon,
  sparkles: SparklesIcon,
};

function TemplateCard({ template }: { template: PollTemplateDefinition }) {
  const scratch = template.id === "CUSTOM";
  const Icon = scratch ? PlusIcon : ICONS[template.icon];
  return (
    <Link
      href={`/polls/new?template=${template.id}`}
      className={cn(
        "group flex h-full flex-col gap-4 rounded-[14px] border bg-panel p-4 outline-none transition-[border-color,box-shadow] hover:border-signal/50 hover:shadow-[0_0_0_1px_var(--signal)] focus-visible:ring-3 focus-visible:ring-ring/35",
        scratch && "border-dashed border-input bg-transparent",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-signal-wash text-signal",
            scratch && "bg-foreground/[0.06] text-foreground",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        {!scratch && <span className="text-xs font-medium text-muted-foreground">{getPollType(template.type).label}</span>}
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-display text-[1.05rem] font-bold group-hover:text-signal-ink">{template.name}</span>
        <span className="text-sm text-muted-foreground">{template.tagline}</span>
      </span>
    </Link>
  );
}

export function TemplateGrid({ templates, className }: { templates: PollTemplateDefinition[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5", className)}>
      {templates.map((template) => (
        <li key={template.id}>
          <TemplateCard template={template} />
        </li>
      ))}
    </ul>
  );
}
