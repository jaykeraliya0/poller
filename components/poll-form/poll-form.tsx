"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPollAction, updatePollAction } from "@/actions/polls";
import { FormSection } from "@/components/forms/form-section";
import { TextField, TextareaField } from "@/components/forms/text-field";
import { ButtonLink } from "@/components/shared/button-link";
import { FormAlert } from "@/components/shared/form-alert";
import { STICKY_BAR_PADDING, StickyActionBar } from "@/components/shared/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BallotPreview } from "./ballot-preview";
import type { PollTemplate, PollType, ResultsVisibility } from "@/generated/prisma/enums";
import type { ActionFailure, FieldErrors } from "@/lib/errors";
import { parsePollSubmission, type PollSubmission } from "@/lib/poll/submission";
import type { PollTemplateDefinition } from "@/lib/poll/templates";
import { cn } from "@/lib/utils";
import { POLL_LIMITS } from "@/lib/validation/poll";
import type { ExistingOption } from "@/poll-types/editor-types";
import { getPollTypeEditor } from "@/poll-types/editors";
import {
  DEFAULT_SETTINGS_DRAFT,
  SettingsPanel,
  settingsToSubmission,
  toLocalInputValue,
  type SettingsDraft,
} from "./settings-panel";
import { TypePicker } from "./type-picker";

/** A saved poll, as the edit form needs it. */
export type EditablePoll = {
  id: string;
  type: PollType;
  template: PollTemplate;
  title: string;
  description: string | null;
  config: unknown;
  options: ExistingOption[];
  closesAt: Date | null;
  allowVoteChange: boolean;
  isAnonymous: boolean;
  requireLogin: boolean;
  resultsVisibility: ResultsVisibility;
  expectedParticipants: number | null;
  responseCount: number;
  votedOptionIds: string[];
};

export type PollFormProps = { mode: "create"; template: PollTemplateDefinition } | { mode: "edit"; poll: EditablePoll };

type Draft = {
  type: PollType;
  title: string;
  description: string;
  config: unknown;
  options: unknown[];
  settings: SettingsDraft;
};

function initialDraft(props: PollFormProps): Draft {
  if (props.mode === "create") {
    const { template } = props;
    const editor = getPollTypeEditor(template.type);
    return {
      type: template.type,
      title: template.title,
      description: template.description,
      config: { ...(editor.defaultConfig() as object), ...template.config },
      options: editor.initialOptions(template.optionLabels),
      settings: DEFAULT_SETTINGS_DRAFT,
    };
  }
  const { poll } = props;
  return {
    type: poll.type,
    title: poll.title,
    description: poll.description ?? "",
    config: poll.config,
    options: getPollTypeEditor(poll.type).fromPoll(poll.config, poll.options),
    settings: {
      hasDeadline: poll.closesAt !== null,
      closesAt: poll.closesAt ? toLocalInputValue(poll.closesAt) : "",
      allowVoteChange: poll.allowVoteChange,
      isAnonymous: poll.isAnonymous,
      requireLogin: poll.requireLogin,
      resultsVisibility: poll.resultsVisibility,
      expectedParticipants: poll.expectedParticipants?.toString() ?? "",
    },
  };
}

/** Scrolls to and focuses the first invalid control after a failed submit. */
function revealFirstError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    // Either an invalid control or an invalid wrapper (field, slot row), whichever comes first.
    const target = form?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid]');
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const controls = "input, textarea, select, button";
    const control = target.matches(controls) ? target : target.querySelector<HTMLElement>(controls);
    control?.focus({ preventScroll: true });
  });
}

export function PollForm(props: PollFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(() => initialDraft(props));
  const [attempted, setAttempted] = useState(false);
  const [serverFailure, setServerFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const editing = props.mode === "edit" ? props.poll : null;
  const hasVotes = (editing?.responseCount ?? 0) > 0;
  const [lockedOptionIds] = useState(() => new Set(editing?.votedOptionIds ?? []));

  const editor = getPollTypeEditor(draft.type);
  const { config, options } = editor.toSubmission(draft.config, draft.options);
  const submission: PollSubmission = {
    template: props.mode === "create" ? props.template.id : props.poll.template,
    type: draft.type,
    title: draft.title,
    description: draft.description,
    config,
    options,
    settings: settingsToSubmission(draft.settings),
  };

  // Mirrors the server: an unchanged saved deadline may already be in the past.
  const deadlineUnchanged =
    editing?.closesAt != null && submission.settings.closesAt === editing.closesAt.toISOString();
  const validate = () =>
    parsePollSubmission(
      deadlineUnchanged ? { ...submission, settings: { ...submission.settings, closesAt: null } } : submission,
    );

  const clientErrors: FieldErrors = attempted
    ? (() => {
        const result = validate();
        return result.success ? {} : result.fieldErrors;
      })()
    : {};
  const errors = { ...serverFailure?.fieldErrors, ...clientErrors };

  const update = (patch: Partial<Draft>) => {
    setServerFailure(null);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const changeType = (type: PollType) => {
    if (type === draft.type) return;
    const next = getPollTypeEditor(type);
    update({
      type,
      config: next.defaultConfig(),
      // Keep typed-in options when both types use the same kind of option.
      options: next.optionKind === editor.optionKind ? draft.options : next.initialOptions([]),
    });
  };

  const handleFailure = (failure: ActionFailure) => {
    setServerFailure(failure);
    if (failure.fieldErrors) revealFirstError(formRef.current);
    else toast.error(failure.message);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (!validate().success) {
      revealFirstError(formRef.current);
      return;
    }
    startTransition(async () => {
      if (!editing) {
        // On success the action redirects, so we only get here on failure.
        handleFailure(await createPollAction(submission));
        return;
      }
      const result = await updatePollAction(editing.id, submission);
      if (!result.ok) return handleFailure(result);
      toast.success(result.data.reopened ? "Changes saved. The poll is open again." : "Changes saved");
      router.push(`/polls/${editing.id}/manage`);
    });
  };

  const formMessage = serverFailure && !serverFailure.fieldErrors ? serverFailure.message : null;
  const editorProps = {
    config: draft.config,
    options: draft.options,
    onConfigChange: (next: unknown) => update({ config: next }),
    onOptionsChange: (next: unknown[]) => update({ options: next }),
    errors,
    lockedOptionIds,
    configLocked: hasVotes,
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className={cn("grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6", STICKY_BAR_PADDING)}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <FormAlert message={formMessage} />

        <FormSection title="Question">
          <TextField
            label="Title"
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
            errors={errors.title}
            placeholder="e.g. Where should we go for lunch?"
            maxLength={POLL_LIMITS.titleMax}
            autoFocus={!draft.title}
            className="h-11 text-base font-medium"
          />
          <TextareaField
            label="Description (optional)"
            value={draft.description}
            onChange={(event) => update({ description: event.target.value })}
            errors={errors.description}
            placeholder="Any context voters should know"
            maxLength={POLL_LIMITS.descriptionMax}
          />
          {props.mode === "create" && props.template.id === "CUSTOM" && (
            <TypePicker value={draft.type} onChange={changeType} errors={errors.type} />
          )}
        </FormSection>

        <FormSection title={editor.sectionTitle} description={editor.sectionDescription}>
          {editor.ConfigFields && <editor.ConfigFields {...editorProps} />}
          <editor.OptionsEditor {...editorProps} />
          <FormAlert message={errors.config?.[0]} />
        </FormSection>

        <FormSection title="Settings" description={editing ? undefined : "Sensible defaults are already set."}>
          <SettingsPanel
            value={draft.settings}
            onChange={(settings) => update({ settings })}
            errors={errors}
            anonymityLocked={hasVotes}
          />
        </FormSection>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-8">
        <div className="hidden lg:block">
          <BallotPreview
            type={draft.type}
            title={draft.title}
            description={draft.description}
            config={submission.config}
            options={submission.options}
          />
        </div>
        <StickyActionBar className="flex flex-col gap-2 sm:flex-row sm:border-t-0 lg:flex-col">
          <Button type="submit" size="lg" disabled={pending} className="h-11 w-full text-[0.9375rem] sm:w-auto sm:min-w-44 lg:w-full">
            {pending && <Spinner data-icon="inline-start" />}
            {editing ? (pending ? "Saving…" : "Save changes") : pending ? "Creating…" : "Create poll"}
          </Button>
          {editing && (
            <ButtonLink href={`/polls/${editing.id}/manage`} variant="ghost" size="lg" className="h-11">
              Cancel
            </ButtonLink>
          )}
        </StickyActionBar>
      </aside>
    </form>
  );
}
