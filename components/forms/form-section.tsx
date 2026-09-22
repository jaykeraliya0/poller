import { cn } from "@/lib/utils";

type FormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormSection({ title, description, children, className }: FormSectionProps) {
  const id = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={cn("panel flex flex-col gap-5 p-4 sm:p-6", className)}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="font-display text-lg font-bold">
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
