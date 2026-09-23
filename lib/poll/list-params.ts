/**
 * Filter, search and page for the "My polls" and "Shared with me" lists, all
 * kept in the URL. "archived" only exists on the owner's list.
 */
export const POLL_FILTERS = ["all", "open", "closed", "archived"] as const;
export type PollFilter = (typeof POLL_FILTERS)[number];

/** Which polls the dashboard is listing: the ones you made, or the ones you voted on. */
export const POLL_SCOPES = ["mine", "voted"] as const;
export type PollScope = (typeof POLL_SCOPES)[number];

export type PollListParams = { scope: PollScope; filter: PollFilter; q: string; page: number };

export const POLLS_PER_PAGE = 10;
const MAX_QUERY_LENGTH = 100;

const DASHBOARD_PATH = "/dashboard";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * `scopes` defaults to the owner scope alone, so a list that offers no scope
 * switcher ignores `?scope=` entirely.
 */
export function parsePollListParams(
  searchParams: SearchParams,
  allowed: readonly PollFilter[] = POLL_FILTERS,
  scopes: readonly PollScope[] = ["mine"],
): PollListParams {
  const requestedScope = first(searchParams.scope);
  const scope = scopes.find((value) => value === requestedScope) ?? "mine";
  const status = first(searchParams.status);
  const filter = allowed.find((value) => value === status) ?? "all";
  const q = (first(searchParams.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const page = Number(first(searchParams.page));
  return { scope, filter, q, page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
}

/** Dashboard URL for the given list state, leaving defaults out so the plain URL stays canonical. */
export function pollListHref(
  { scope = "mine", filter = "all", q = "", page = 1 }: Partial<PollListParams>,
  basePath: string = DASHBOARD_PATH,
): string {
  const params = new URLSearchParams();
  if (scope !== "mine") params.set("scope", scope);
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
