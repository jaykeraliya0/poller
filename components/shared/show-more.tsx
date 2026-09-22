import { ChevronDownIcon } from "lucide-react";

type ShowMoreProps<T> = {
  items: T[];
  /** How many to show before the "Show more" disclosure. */
  initial: number;
  noun: string;
  render: (items: T[]) => React.ReactNode;
};

/**
 * Renders the first `initial` items and tucks the rest into a native
 * <details> disclosure: no JavaScript, keyboard and screen-reader friendly.
 */
export function ShowMore<T>({ items, initial, noun, render }: ShowMoreProps<T>) {
  if (items.length <= initial) return render(items);
  const rest = items.length - initial;
  return (
    <>
      {render(items.slice(0, initial))}
      <details className="group mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg text-sm font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
          <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          <span className="group-open:hidden">
            Show {rest} more {noun}
          </span>
          <span className="hidden group-open:inline">Show fewer</span>
        </summary>
        <div className="mt-4">{render(items.slice(initial))}</div>
      </details>
    </>
  );
}
