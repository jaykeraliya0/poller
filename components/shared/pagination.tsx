import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { getPageItems } from "@/lib/poll/list-params";
import { cn } from "@/lib/utils";

const itemClass =
  "flex h-9 min-w-9 items-center justify-center gap-1 rounded-[9px] px-2.5 text-sm font-medium tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/35";

function PageLink({ href, label, disabled, children }: { href: string; label: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(itemClass, "text-muted-foreground/50")}>
        {children}
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <Link href={href} className={cn(itemClass, "text-muted-foreground hover:bg-muted hover:text-foreground")}>
      {children}
      <span className="sr-only">{label}</span>
    </Link>
  );
}

/** Link-based pagination, so every page has a real URL that works without JavaScript. */
export function Pagination({
  page,
  pageCount,
  hrefFor,
  className,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Pagination" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          <PageLink href={hrefFor(page - 1)} label="Previous page" disabled={page <= 1}>
            <ChevronLeftIcon className="size-4" aria-hidden />
            <span className="hidden sm:inline" aria-hidden>
              Previous
            </span>
          </PageLink>
        </li>
        {getPageItems(page, pageCount).map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden className={cn(itemClass, "px-1 text-muted-foreground")}>
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  itemClass,
                  "text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-background",
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}
        <li>
          <PageLink href={hrefFor(page + 1)} label="Next page" disabled={page >= pageCount}>
            <span className="hidden sm:inline" aria-hidden>
              Next
            </span>
            <ChevronRightIcon className="size-4" aria-hidden />
          </PageLink>
        </li>
      </ul>
    </nav>
  );
}
