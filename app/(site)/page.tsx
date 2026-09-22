import { PageContainer } from "@/components/layout/page-container";
import { DemoBoard } from "@/components/marketing/demo-board";
import { TemplateGrid } from "@/components/poll/template-card";
import { ButtonLink } from "@/components/shared/button-link";
import { QueryToast } from "@/components/shared/query-toast";
import { POLL_TEMPLATES } from "@/lib/poll/templates";
import { cn } from "@/lib/utils";

/** Tiny drawings of each poll type's ballot, in the app's own visual language. */
function TypeGlyph({ kind }: { kind: "time" | "rank" | "rate" | "choice" }) {
  const cell = "rounded-[4px]";
  switch (kind) {
    case "time":
      return (
        <div className="grid w-full grid-cols-3 gap-1 rounded-[8px] bg-muted p-1" aria-hidden>
          <span className={cn(cell, "h-5 bg-signal")} />
          <span className={cn(cell, "h-5 bg-viz-accent-soft")} />
          <span className={cn(cell, "h-5 bg-panel")} />
        </div>
      );
    case "rank":
      return (
        <div className="flex w-full flex-col gap-1" aria-hidden>
          {[100, 72, 48].map((width, index) => (
            <span key={width} className="flex items-center gap-1.5">
              <span className={cn(cell, "font-display flex size-4 items-center justify-center bg-signal text-[0.6rem] font-bold text-primary-foreground")}>
                {index + 1}
              </span>
              <span className={cn(cell, "h-2 bg-viz-rest")} style={{ width: `${width}%` }} />
            </span>
          ))}
        </div>
      );
    case "rate":
      return (
        <div className="grid w-full grid-cols-5 gap-1 rounded-[8px] bg-muted p-1" aria-hidden>
          {[1, 2, 3, 4, 5].map((score) => (
            <span key={score} className={cn(cell, "h-5", score === 4 ? "bg-signal" : "bg-panel")} />
          ))}
        </div>
      );
    case "choice":
      return (
        <div className="flex w-full flex-col gap-1" aria-hidden>
          {[88, 52, 30].map((width, index) => (
            <span key={width} className="h-2 w-full rounded-full bg-viz-track">
              <span className={cn("block h-full rounded-full", index === 0 ? "bg-signal" : "bg-viz-rest")} style={{ width: `${width}%` }} />
            </span>
          ))}
        </div>
      );
  }
}

const TYPES = [
  { kind: "time", name: "Find a time", body: "Everyone marks each slot yes, if need be, or no. You get the time that works for most." },
  { kind: "rank", name: "Ranking", body: "People put options in order. Points decide the winner, and ties are called out." },
  { kind: "rate", name: "Rating", body: "Score each option on a scale, and see where the group is split rather than lukewarm." },
  { kind: "choice", name: "Multiple choice", body: "Pick one, or a few. See who's leading, by how much, and how strongly people agree." },
] as const;

export default function Home() {
  return (
    <>
      <QueryToast param="account" value="deleted" message="Your account and polls were deleted" />

      <PageContainer className="grid items-center gap-12 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:py-20">
        <section className="flex flex-col items-start gap-6">
          <h1 className="font-display text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.035em] sm:text-[3.75rem] lg:text-[4.25rem]">
            Ask the group.
            <br />
            Get a straight answer.
          </h1>
          <p className="max-w-[46ch] text-lg text-pretty text-muted-foreground">
            Create a poll in a minute and share one link. Poller counts the votes and tells you what the group decided,
            not just the numbers.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/polls/new" size="lg" className="h-12 px-6 text-base">
              Create a poll
            </ButtonLink>
            <ButtonLink href="#templates" variant="ghost" size="lg" className="h-12 px-4 text-base">
              Browse templates
            </ButtonLink>
          </div>
          <p className="text-sm text-muted-foreground">Voters don&apos;t need an account.</p>
        </section>
        <DemoBoard className="w-full max-w-lg justify-self-center lg:justify-self-end" />
      </PageContainer>

      <section aria-labelledby="types-heading" className="border-y bg-panel">
        <PageContainer className="flex flex-col gap-8 py-12 lg:py-16">
          <h2 id="types-heading" className="font-display text-[1.75rem] leading-tight font-bold">
            Four ways to ask
          </h2>
          <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {TYPES.map((type) => (
              <li key={type.kind} className="flex flex-col gap-4">
                <div className="flex h-16 items-center rounded-[12px] border bg-canvas px-4">
                  <TypeGlyph kind={type.kind} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display text-lg font-bold">{type.name}</h3>
                  <p className="text-sm text-muted-foreground">{type.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </PageContainer>
      </section>

      <PageContainer className="flex flex-col gap-6 py-12 lg:py-16">
        <section id="templates" aria-labelledby="templates-heading" className="flex scroll-mt-24 flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h2 id="templates-heading" className="font-display text-[1.75rem] leading-tight font-bold">
              Start from a template
            </h2>
            <p className="text-muted-foreground">Each one comes with a question and options you can change.</p>
          </div>
          <TemplateGrid templates={POLL_TEMPLATES} />
        </section>
      </PageContainer>
    </>
  );
}
