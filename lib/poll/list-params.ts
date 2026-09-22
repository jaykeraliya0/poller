/** Filter, search and page for the "My polls" and "Shared with me" lists, all kept in the URL. */
export const POLL_FILTERS = ["all", "open", "closed"] as const;
export type PollFilter = (typeof POLL_FILTERS)[number];

export type PollListParams = { filter: PollFilter; q: string; page: number };

export const POLLS_PER_PAGE = 10;
const MAX_QUERY_LENGTH = 100;

const DASHBOARD_PATH = "/dashboard";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parsePollListParams(searchParams: SearchParams): PollListParams {
  const status = first(searchParams.status);
  const filter = POLL_FILTERS.find((value) => value === status) ?? "all";
  const q = (first(searchParams.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const page = Number(first(searchParams.page));
  return { filter, q, page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
}

/** Dashboard URL for the given list state, leaving defaults out so the plain URL stays canonical. */
export function pollListHref(
  { filter = "all", q = "", page = 1 }: Partial<PollListParams>,
  basePath: string = DASHBOARD_PATH,
): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (q.trim()) params.set("q", q.trim());
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export type PageItem = number | "gap";

/**
 * Page numbers to show: always the first and last page plus a window around the
 * current one, with "gap" standing in for runs of hidden pages. A gap that would
 * hide a single page shows that page instead.
 */
export function getPageItems(current: number, pageCount: number, siblings = 1): PageItem[] {
  const pages = new Set<number>([1, pageCount]);
  for (let page = current - siblings; page <= current + siblings; page++) {
    if (page >= 1 && page <= pageCount) pages.add(page);
  }

  const sorted = [...pages].filter((page) => page >= 1).sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && page - previous > 2) items.push("gap");
    items.push(page);
  });
  return items;
}
