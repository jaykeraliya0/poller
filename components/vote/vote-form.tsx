"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitVoteAction } from "@/actions/votes";
import { TextField, TextareaField } from "@/components/forms/text-field";
import { FormAlert } from "@/components/shared/form-alert";
import { STICKY_BAR_PADDING, StickyActionBar } from "@/components/shared/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PollType } from "@/generated/prisma/enums";
import { ErrorCode, toFieldErrors, type ActionFailure, type FieldErrors } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { POLL_LIMITS } from "@/lib/validation/poll";
import { getPollType } from "@/poll-types/registry";
import { getPollTypeVoteUI } from "@/poll-types/vote-inputs";
import type { VoteOption } from "@/poll-types/vote-types";
import { WithdrawVoteButton } from "./withdraw-vote-button";

export type VoteFormProps = {
  poll: { slug: string; type: PollType; config: unknown; isAnonymous: boolean; allowVoteChange: boolean };
  options: VoteOption[];
  /** Existing answers in the type's form shape, when changing a vote. */
  initialAnswers: unknown | null;
  initialName: string;
  initialComment: string;
  hasVoted: boolean;
  newOptionIds: string[];
};

/** Failures after which submitting again can't help. */
const TERMINAL: ReadonlySet<string> = new Set([ErrorCode.POLL_CLOSED, ErrorCode.ALREADY_VOTED, ErrorCode.NOT_FOUND]);

function validate(props: VoteFormProps, answers: unknown, voterName: string): FieldErrors {
  const errors: FieldErrors = {};
  const parsed = getPollType(props.poll.type)
    .answersSchema({ config: props.poll.config, options: props.options })
    .safeParse(answers);
  if (!parsed.success) {
    for (const [key, messages] of Object.entries(toFieldErrors(parsed.error))) {
      errors[key === "_form" ? "answers" : `answers.${key}`] = messages;
    }
  }
  if (!props.poll.isAnonymous && !voterName.trim()) {
    errors.voterName = ["Enter your name so the organiser knows who voted"];
  }
  return errors;
}

export function VoteForm(props: VoteFormProps) {
  const { poll, options, hasVoted } = props;
  const ui = getPollTypeVoteUI(poll.type);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [answers, setAnswers] = useState<unknown>(() => props.initialAnswers ?? ui.emptyAnswers(options));
  const [voterName, setVoterName] = useState(props.initialName);
  const [comment, setComment] = useState(props.initialComment);
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const newOptionIds = useMemo(() => new Set(props.newOptionIds), [props.newOptionIds]);
  const clientErrors = attempted ? validate(props, answers, voterName) : {};
  const errors = { ...failure?.fieldErrors, ...clientErrors };
  const blocked = failure !== null && TERMINAL.has(failure.code);

  const edit = <T,>(setter: (value: T) => void) => (value: T) => {
    // Keep terminal failures (e.g. poll closed) visible; clear the rest on edit.
    if (failure && !TERMINAL.has(failure.code)) setFailure(null);
    setter(value);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(validate(props, answers, voterName)).length > 0) {
      requestAnimationFrame(() =>
        formRef.current?.querySelector('[data-invalid], [aria-invalid="true"]')?.scrollIntoView({ block: "center", behavior: "smooth" }),
      );
      return;
    }
    startTransition(async () => {
      const result = await submitVoteAction({ slug: poll.slug, answers, voterName, comment });
      if (!result.ok) {
        // Input is kept so nothing is lost, e.g. when the deadline passed mid-form.
        setFailure(result);
        if (!result.fieldErrors) toast.error(result.message);
        return;
      }
      setFailure(null);
      toast.success(result.data.updated ? "Your vote was updated" : "Your vote is in. Thanks!");
      if (result.data.resultsVisible) router.push(`/p/${poll.slug}/results`);
      else router.refresh();
    });
  };

  const bannerMessage = failure && !failure.fieldErrors ? failure.message : null;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className={cn("grid gap-5 lg:grid-cols-[minmax(0,1fr)_20.5rem] lg:items-start lg:gap-6", STICKY_BAR_PADDING)}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <FormAlert message={bannerMessage} />
        {failure?.code === ErrorCode.LOGIN_REQUIRED && (
          <Link href={`/login?next=/p/${poll.slug}`} className="text-sm font-medium text-signal-ink underline-offset-4 hover:underline">
            Sign in to vote
          </Link>
        )}

        <section aria-label="Your answers" className="panel @container p-4 sm:p-6">
          <ui.VoteInput
            config={poll.config}
            options={options}
            value={answers}
            onChange={edit(setAnswers)}
            errors={errors}
            newOptionIds={newOptionIds}
            disabled={pending || blocked}
          />
        </section>
      </div>

      <aside className="panel flex flex-col gap-5 p-4 sm:p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-bold">{poll.isAnonymous ? "Anything to add?" : "About you"}</h2>
        {poll.isAnonymous ? (
          <p className="-mt-3 text-sm text-muted-foreground">This poll is anonymous: your name isn&apos;t collected.</p>
        ) : (
          <TextField
            label="Your name"
            autoComplete="name"
            value={voterName}
            onChange={(event) => edit(setVoterName)(event.target.value)}
            errors={errors.voterName}
            maxLength={POLL_LIMITS.voterNameMax}
            disabled={blocked}
          />
        )}
        <TextareaField
          label="Comment (optional)"
          value={comment}
          onChange={(event) => edit(setComment)(event.target.value)}
          errors={errors.comment}
          maxLength={POLL_LIMITS.commentMax}
          description={`${comment.length}/${POLL_LIMITS.commentMax}`}
          placeholder="Share context with the organiser"
          disabled={blocked}
        />

        <StickyActionBar className="flex flex-col gap-2 sm:border-t sm:pt-5">
          <p className="text-center text-xs font-medium text-muted-foreground sm:text-left" aria-live="polite">
            {ui.progress(answers, options, poll.config)}
          </p>
          <Button type="submit" size="lg" disabled={pending || blocked} className="h-11 w-full text-[0.9375rem]">
            {pending && <Spinner data-icon="inline-start" />}
            {pending ? "Saving…" : hasVoted ? "Update vote" : "Submit vote"}
          </Button>
          {hasVoted && poll.allowVoteChange && !blocked && <WithdrawVoteButton slug={poll.slug} />}
        </StickyActionBar>
      </aside>
    </form>
  );
}
