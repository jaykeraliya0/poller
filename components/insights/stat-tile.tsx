import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/**
 * A headline number in the stats rail: the number is the chart. dt and dd are
 * direct children of the group (valid <dl>), overlapped in one grid cell so the
 * label sits left of the figure.
 */
export function StatTile({ label, value, detail, children, className }: StatTileProps) {
  return (
    <div className={cn("grid px-4 py-3.5", className)}>
      <dt className="col-start-1 row-start-1 pt-1 text-sm text-muted-foreground">{label}</dt>
      <dd className="col-start-1 row-start-1 grid grid-cols-[minmax(0,1fr)_auto] gap-y-1.5">
        <span className="col-start-2 font-display text-[1.6rem] leading-none font-bold tabular-nums">{value}</span>
        {children && <div className="col-span-2">{children}</div>}
        {detail && <p className="col-span-2 text-xs text-muted-foreground">{detail}</p>}
      </dd>
    </div>
  );
}
