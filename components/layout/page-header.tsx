import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons aligned to the right of the title on wide screens. */
  actions?: React.ReactNode;
  /** Small row above the title, e.g. a back link. */
  above?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, above, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {above}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-[1.75rem] leading-tight font-bold break-words sm:text-[2rem]">{title}</h1>
          {description && <p className="max-w-[65ch] text-pretty text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
