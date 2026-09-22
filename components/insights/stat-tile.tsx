import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/** A headline number: the number is the chart. */
export function StatTile({ label, value, detail, children, className }: StatTileProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-3xl border bg-card p-4", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex flex-col gap-1.5">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {children}
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </dd>
    </div>
  );
}
