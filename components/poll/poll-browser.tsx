"use client";

import { useEffect, useState, useTransition } from "react";
import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, SearchIcon } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { Spinner } from "@/components/ui/spinner";
import { POLLS_PER_PAGE, pollListHref, type PollFilter, type PollListParams } from "@/lib/poll/list-params";
import type { PollStatus } from "@/lib/poll/status";
import { StatusPill } from "./status-badge";

export type PollSummary = {
  id: string;
  title: string;
  typeLabel: string;
  status: PollStatus;
  /** "Open", "Closes in 3 hours" or "Closed", computed on the server. */
  statusLabel: string;
  responses: number;
  expected: number | null;
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

type PollBrowserProps = {
  /** The current page of polls, already filtered and searched on the server. */
  polls: PollSummary[];
  params: PollListParams;
  counts: Record<PollFilter, number>;
  /** Polls matching the filter and search, across every page. */
  total: number;
  pageCount: number;
};

export function PollBrowser({ polls, params, counts, total, pageCount }: PollBrowserProps) {
  const { filter, q, page } = params;
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
      startSearch(() => router.replace(pollListHref({ filter, q: next }), { scroll: false }));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, q, filter, router]);

  const tabs: { value: PollFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ];
  const firstShown = (page - 1) * POLLS_PER_PAGE + 1;
  const lastShown = firstShown + polls.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter polls" className="inline-flex self-start rounded-[10px] bg-foreground/[0.06] p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={pollListHref({ filter: tab.value, q })}
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
        <Form action="/dashboard" role="search" className="relative sm:w-72">
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
          {q ? `No polls match “${q}”.` : filter === "open" ? "No open polls right now." : "No closed polls yet."}
        </p>
      ) : (
        <div className="panel overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1fr)_10rem_11rem_8rem_1.25rem] gap-4 border-b px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid" aria-hidden>
            <span>Poll</span>
            <span>Status</span>
            <span>Responses</span>
            <span>Created</span>
            <span />
          </div>
          <ul className="divide-y">
            {polls.map((poll) => (
              <li key={poll.id}>
                <Link
                  href={`/polls/${poll.id}/manage`}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-inset sm:px-5 md:grid-cols-[minmax(0,1fr)_10rem_11rem_8rem_1.25rem]"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold group-hover:text-signal-ink">{poll.title}</span>
                    <span className="text-xs text-muted-foreground">{poll.typeLabel}</span>
                  </span>
                  <span className="justify-self-end md:justify-self-start">
                    <StatusPill status={poll.status} label={poll.statusLabel} />
                  </span>
                  <span className="md:col-auto">
                    <Turnout responses={poll.responses} expected={poll.expected} />
                  </span>
                  <span className="justify-self-end text-sm text-muted-foreground md:justify-self-start">{poll.createdLabel}</span>
                  <ChevronRightIcon className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground md:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {total <= POLLS_PER_PAGE
              ? `${total} ${total === 1 ? "poll" : "polls"}`
              : `Showing ${firstShown}–${lastShown} of ${total} polls`}
          </p>
          <Pagination page={page} pageCount={pageCount} hrefFor={(target) => pollListHref({ filter, q, page: target })} />
        </div>
      )}
    </div>
  );
}
