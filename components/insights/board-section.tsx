import { cn } from "@/lib/utils";

/** A titled block of the results board. */
export function BoardSection({
  title,
  count,
  description,
  children,
  id,
  className,
}: {
  title: string;
  count?: number;
  description?: string;
  children: React.ReactNode;
  id: string;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("panel flex min-w-0 flex-col gap-4 p-4 sm:p-5", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="flex items-baseline gap-2 font-semibold">
          {title}
          {count !== undefined && <span className="text-sm font-normal text-muted-foreground tabular-nums">{count}</span>}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
