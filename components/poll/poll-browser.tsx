"use client";

import { useEffect, useState, useTransition } from "react";
import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { POLLS_PER_PAGE, pollListHref, type PollFilter, type PollListParams } from "@/lib/poll/list-params";
import type { PollStatus } from "@/lib/poll/status";
import { PollBulkBar } from "./poll-bulk-bar";
import { PrivatePill } from "./private-pill";
import { StatusPill } from "./status-badge";

export type PollSummary = {
  id: string;
  href: string;
  title: string;
  /** Under the title: the type, and on shared polls who made it. */
  subtitle: string;
  isPrivate: boolean;
  status: PollStatus;
  /** "Open", "Closes in 3 hours" or "Closed", computed on the server. */
  statusLabel: string;
  /** Owners see turnout; invitees see whether they've voted. */
  detail: { kind: "turnout"; responses: number; expected: number | null } | { kind: "vote"; voted: boolean };
  createdLabel: string;
};

const SEARCH_DELAY_MS = 300;

function Turnout({ responses, expected }: { responses: number; expected: number | null }) {
  const ratio = expected ? Math.min(responses / expected, 1) : null;
  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-sm tabular-nums">
        <span className="font-display text-base font-bold">{responses}</span>
        <span className="text-muted-foreground">
          {expected ? ` of ${expected}` : ""} {responses === 1 ? "response" : "responses"}
        </span>
      </span>
      {ratio !== null && (
        <span className="h-1 w-24 overflow-hidden rounded-full bg-viz-track" aria-hidden>
          <span className="block h-full rounded-full bg-viz-accent" style={{ width: `${ratio * 100}%` }} />
        </span>
      )}
    </span>
  );
}

function VoteState({ voted }: { voted: boolean }) {
  return voted ? (
    <span className="flex items-center gap-1.5 text-sm">
      <CheckIcon className="size-4 text-signal" aria-hidden />
      Voted
    </span>
  ) : (
    <span className="text-sm text-muted-foreground">Not voted yet</span>
  );
}

type PollBrowserProps = {
  /** The list's own page, which filter, search and page links point back to. */
  basePath: string;
  /** Column heading for the per-poll detail (turnout or your vote). */
  detailHeading: string;
  /** The current page of polls, already filtered and searched on the server. */
  polls: PollSummary[];
  params: PollListParams;
  counts: Record<PollFilter, number>;
  /** Polls matching the filter and search, across every page. */
  total: number;
  pageCount: number;
  /** The filter tabs to offer, in order. */
  filters?: readonly PollFilter[];
  /** Owner lists: tick polls to close, archive or delete several at once. */
  selectable?: boolean;
};

const FILTER_LABELS: Record<PollFilter, string> = { all: "All", open: "Open", closed: "Closed", archived: "Archived" };

const EMPTY_MESSAGES: Record<PollFilter, string> = {
  all: "No polls yet.",
  open: "No open polls right now.",
  closed: "No closed polls yet.",
  archived: "Nothing archived. Archive polls you're done with to keep this list tidy.",
};

export function PollBrowser({
  basePath,
  detailHeading,
  polls,
  params,
  counts,
  total,
  pageCount,
  filters = ["all", "open", "closed"],
  selectable = false,
}: PollBrowserProps) {
  const { filter, q, page } = params;
  // Selection belongs to the page being shown: a new filter, search or page starts empty.
  const listKey = `${filter}|${q}|${page}|${polls.map((poll) => poll.id).join()}`;
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({ key: listKey, ids: [] });
  const selectedIds = selection.key === listKey ? selection.ids : [];
  const setSelected = (ids: string[]) => setSelection({ key: listKey, ids });
  const toggle = (id: string, checked: boolean) =>
    setSelected(checked ? [...selectedIds, id] : selectedIds.filter((selected) => selected !== id));
  const allSelected = polls.length > 0 && selectedIds.length === polls.length;
  const router = useRouter();
  const [isSearching, startSearch] = useTransition();
  const [query, setQuery] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  const [pushedQ, setPushedQ] = useState<string | null>(null);
  // Adopt the URL's search when it changes from outside the box (back button, Enter).
  // Our own debounced update is skipped so it can't overwrite what was typed since.
  if (q !== syncedQ) {
    setSyncedQ(q);
    if (q === pushedQ) setPushedQ(null);
    else setQuery(q);
  }

  // Search as the user types, once they pause. A new search starts again from page 1.
  useEffect(() => {
    const next = query.trim();
    if (next === q) return;
    const timer = setTimeout(() => {
      setPushedQ(next);
      startSearch(() => router.replace(pollListHref({ filter, q: next }, basePath), { scroll: false }));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, q, filter, router, basePath]);

  const tabs = filters.map((value) => ({ value, label: FILTER_LABELS[value] }));
  const firstShown = (page - 1) * POLLS_PER_PAGE + 1;
  const lastShown = firstShown + polls.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter polls" className="inline-flex self-start rounded-[10px] bg-foreground/[0.06] p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={pollListHref({ filter: tab.value, q }, basePath)}
              scroll={false}
              aria-current={filter === tab.value ? "page" : undefined}
              className="flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/35 aria-[current=page]:bg-panel aria-[current=page]:text-foreground aria-[current=page]:shadow-[0_1px_2px_rgb(21_24_35/0.08)]"
            >
              {tab.label}
              <span className="text-xs text-muted-foreground tabular-nums">{counts[tab.value]}</span>
            </Link>
          ))}
        </nav>
        {/* A real GET form, so Enter (or no JavaScript at all) still searches. */}
        <Form action={basePath} role="search" className="relative sm:w-72">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <label>
          <span className="sr-only">Search polls</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title"
            className="h-10 w-full rounded-[10px] border border-input bg-panel pr-9 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 md:text-sm"
          />
          </label>
          {isSearching && (
            <Spinner className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-label="Searching" />
          )}
        </Form>
      </div>

      {polls.length === 0 ? (
        <p className="panel px-5 py-10 text-center text-sm text-muted-foreground">
          {q ? `No polls match “${q}”.` : EMPTY_MESSAGES[filter]}
        </p>
      ) : (
        <div className="panel overflow-hidden">
          <div className="flex items-center border-b">
            {selectable && (
              <label className="flex min-h-11 items-center gap-3 py-2 pl-4 sm:pl-5 md:min-h-0">
                <Checkbox
                  checked={allSelected}
                  indeterminate={selectedIds.length > 0 && !allSelected}
                  onCheckedChange={(checked) => setSelected(checked ? polls.map((poll) => poll.id) : [])}
                  aria-label="Select all polls on this page"
                />
                <span className="text-xs font-medium text-muted-foreground md:sr-only">Select all</span>
              </label>
            )}
            <div
              className={cn(
                "hidden flex-1 grid-cols-[minmax(0,1fr)_10rem_11rem_8rem_1.25rem] gap-4 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid",
                selectable && "pl-4",
              )}
              aria-hidden
            >
              <span>Poll</span>
              <span>Status</span>
              <span>{detailHeading}</span>
              <span>Created</span>
              <span />
            </div>
          </div>
          <ul className="divide-y">
            {polls.map((poll) => (
              <li key={poll.id} className={cn(selectable && "flex items-center", selectedIds.includes(poll.id) && "bg-signal-wash/60")}>
                {selectable && (
                  <span className="flex self-stretch items-center pl-4 sm:pl-5">
                    <Checkbox
                      checked={selectedIds.includes(poll.id)}
                      onCheckedChange={(checked) => toggle(poll.id, checked)}
                      aria-label={`Select ${poll.title}`}
                    />
                  </span>
                )}
                <Link
                  href={poll.href}
                  className="group grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-inset sm:px-5 md:grid-cols-[minmax(0,1fr)_10rem_11rem_8rem_1.25rem]"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold group-hover:text-signal-ink">{poll.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{poll.subtitle}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 justify-self-end md:justify-self-start">
                    <StatusPill status={poll.status} label={poll.statusLabel} />
                    {poll.isPrivate && <PrivatePill />}
                  </span>
                  <span className="md:col-auto">
                    {poll.detail.kind === "turnout" ? (
                      <Turnout responses={poll.detail.responses} expected={poll.detail.expected} />
                    ) : (
                      <VoteState voted={poll.detail.voted} />
                    )}
                  </span>
                  <span className="justify-self-end text-sm text-muted-foreground md:justify-self-start">{poll.createdLabel}</span>
                  <ChevronRightIcon className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground md:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectable && selectedIds.length > 0 && (
        <PollBulkBar selectedIds={selectedIds} archivedView={filter === "archived"} onDone={() => setSelected([])} />
      )}

      {total > 0 && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {total <= POLLS_PER_PAGE
              ? `${total} ${total === 1 ? "poll" : "polls"}`
              : `Showing ${firstShown}–${lastShown} of ${total} polls`}
          </p>
          <Pagination page={page} pageCount={pageCount} hrefFor={(target) => pollListHref({ filter, q, page: target }, basePath)} />
        </div>
      )}
    </div>
  );
}
