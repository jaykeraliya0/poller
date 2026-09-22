"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, SearchIcon } from "lucide-react";
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

type Filter = "all" | "open" | "closed";

const isOpen = (poll: PollSummary) => poll.status !== "CLOSED";

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

export function PollBrowser({ polls }: { polls: PollSummary[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());

  const counts = { all: polls.length, open: polls.filter(isOpen).length, closed: polls.filter((p) => !isOpen(p)).length };
  const visible = polls.filter(
    (poll) =>
      (filter === "all" || (filter === "open") === isOpen(poll)) &&
      (!deferredQuery || poll.title.toLocaleLowerCase().includes(deferredQuery)),
  );

  const tabs: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter polls" className="inline-flex self-start rounded-[10px] bg-foreground/[0.06] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={filter === tab.value}
              onClick={() => setFilter(tab.value)}
              className="flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/35 aria-pressed:bg-panel aria-pressed:text-foreground aria-pressed:shadow-[0_1px_2px_rgb(21_24_35/0.08)]"
            >
              {tab.label}
              <span className="text-xs text-muted-foreground tabular-nums">{counts[tab.value]}</span>
            </button>
          ))}
        </div>
        <label className="relative sm:w-72">
          <span className="sr-only">Search polls</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title"
            className="h-10 w-full rounded-[10px] border border-input bg-panel pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 md:text-sm"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="panel px-5 py-10 text-center text-sm text-muted-foreground">
          {deferredQuery ? `No polls match “${query.trim()}”.` : filter === "open" ? "No open polls right now." : "No closed polls yet."}
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
            {visible.map((poll) => (
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
    </div>
  );
}
