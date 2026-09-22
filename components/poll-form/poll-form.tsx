"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createPollAction } from "@/actions/polls";
import { FormSection } from "@/components/forms/form-section";
import { TextField, TextareaField } from "@/components/forms/text-field";
import { FormAlert } from "@/components/shared/form-alert";
import { STICKY_BAR_PADDING, StickyActionBar } from "@/components/shared/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PollType } from "@/generated/prisma/enums";
import type { ActionFailure, FieldErrors } from "@/lib/errors";
import { parsePollSubmission, type PollSubmission } from "@/lib/poll/submission";
import type { PollTemplateDefinition } from "@/lib/poll/templates";
import { cn } from "@/lib/utils";
import { POLL_LIMITS } from "@/lib/validation/poll";
import { getPollTypeEditor } from "@/poll-types/editors";
import { DEFAULT_SETTINGS_DRAFT, SettingsPanel, settingsToSubmission, type SettingsDraft } from "./settings-panel";
import { TypePicker } from "./type-picker";

type Draft = {
  type: PollType;
  title: string;
  description: string;
  config: unknown;
  options: unknown[];
  settings: SettingsDraft;
};

function initialDraft(template: PollTemplateDefinition): Draft {
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

function toSubmission(template: PollTemplateDefinition, draft: Draft): PollSubmission {
  const { config, options } = getPollTypeEditor(draft.type).toSubmission(draft.config, draft.options);
  return {
    template: template.id,
    type: draft.type,
    title: draft.title,
    description: draft.description,
    config,
    options,
    settings: settingsToSubmission(draft.settings),
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

export function PollForm({ template }: { template: PollTemplateDefinition }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(() => initialDraft(template));
  const [attempted, setAttempted] = useState(false);
  const [serverFailure, setServerFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const editor = getPollTypeEditor(draft.type);
  const submission = toSubmission(template, draft);
  const clientErrors: FieldErrors = attempted
    ? (() => {
        const result = parsePollSubmission(submission);
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

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (!parsePollSubmission(submission).success) {
      revealFirstError(formRef.current);
      return;
    }
    startTransition(async () => {
      const failure = await createPollAction(submission);
      // On success the action redirects, so we only get here on failure.
      setServerFailure(failure);
      if (failure.fieldErrors) revealFirstError(formRef.current);
      else toast.error(failure.message);
    });
  };

  const formMessage = serverFailure && !serverFailure.fieldErrors ? serverFailure.message : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className={cn("flex flex-col gap-4", STICKY_BAR_PADDING)}>
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
        />
        <TextareaField
          label="Description (optional)"
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
          errors={errors.description}
          placeholder="Any context voters should know"
          maxLength={POLL_LIMITS.descriptionMax}
        />
        {template.id === "CUSTOM" && (
          <TypePicker value={draft.type} onChange={changeType} errors={errors.type} />
        )}
      </FormSection>

      <FormSection title={editor.sectionTitle} description={editor.sectionDescription}>
        {editor.ConfigFields && (
          <editor.ConfigFields
            config={draft.config}
            options={draft.options}
            onConfigChange={(config) => update({ config })}
            onOptionsChange={(options) => update({ options })}
            errors={errors}
          />
        )}
        <editor.OptionsEditor
          config={draft.config}
          options={draft.options}
          onConfigChange={(config) => update({ config })}
          onOptionsChange={(options) => update({ options })}
          errors={errors}
        />
      </FormSection>

      <FormSection title="Settings" description="Sensible defaults are already set.">
        <SettingsPanel value={draft.settings} onChange={(settings) => update({ settings })} errors={errors} />
      </FormSection>

      <StickyActionBar>
        <Button type="submit" size="lg" disabled={pending} className="h-11 w-full sm:w-auto sm:min-w-40">
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Creating…" : "Create poll"}
        </Button>
      </StickyActionBar>
    </form>
  );
}
