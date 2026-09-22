"use client";

import { FieldShell } from "@/components/forms/field-shell";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import type { ResultsVisibility } from "@/generated/prisma/enums";
import type { FieldErrors } from "@/lib/errors";
import type { PollSubmission } from "@/lib/poll/submission";

export type SettingsDraft = {
  hasDeadline: boolean;
  /** `datetime-local` value in the creator's local time. */
  closesAt: string;
  allowVoteChange: boolean;
  isAnonymous: boolean;
  requireLogin: boolean;
  resultsVisibility: ResultsVisibility;
  expectedParticipants: string;
};

export const DEFAULT_SETTINGS_DRAFT: SettingsDraft = {
  hasDeadline: false,
  closesAt: "",
  allowVoteChange: true,
  isAnonymous: false,
  requireLogin: false,
  resultsVisibility: "PUBLIC",
  expectedParticipants: "",
};

export function settingsToSubmission(draft: SettingsDraft): PollSubmission["settings"] {
  const deadline = draft.hasDeadline ? new Date(draft.closesAt) : null;
  return {
    // An empty or broken date becomes "" so validation reports it on the field.
    closesAt: deadline ? (Number.isNaN(deadline.getTime()) ? "" : deadline.toISOString()) : null,
    allowVoteChange: draft.allowVoteChange,
    isAnonymous: draft.isAnonymous,
    requireLogin: draft.requireLogin,
    resultsVisibility: draft.resultsVisibility,
    expectedParticipants: draft.expectedParticipants.trim() === "" ? null : Number(draft.expectedParticipants),
  };
}

const VISIBILITY_OPTIONS: { value: ResultsVisibility; label: string; description: string }[] = [
  { value: "PUBLIC", label: "Anyone with the link", description: "Results are visible at any time." },
  { value: "AFTER_VOTE", label: "After voting", description: "People see results once they've voted." },
  { value: "AFTER_CLOSE", label: "After the poll closes", description: "Nobody is swayed by early results." },
  { value: "OWNER_ONLY", label: "Only me", description: "Voters never see the results." },
];

type ToggleRowProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleRow({ id, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </Field>
  );
}

type SettingsPanelProps = {
  value: SettingsDraft;
  onChange: (value: SettingsDraft) => void;
  errors: FieldErrors;
};

export function SettingsPanel({ value, onChange, errors }: SettingsPanelProps) {
  const set = <K extends keyof SettingsDraft>(key: K, next: SettingsDraft[K]) => onChange({ ...value, [key]: next });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <ToggleRow
          id="settings-deadline"
          label="Set a deadline"
          description="Voting closes automatically. You can also close it early."
          checked={value.hasDeadline}
          onChange={(checked) => set("hasDeadline", checked)}
        />
        {value.hasDeadline && (
          <FieldShell label="Closes at" errors={errors["settings.closesAt"]}>
            {(control) => (
              <Input
                {...control}
                type="datetime-local"
                value={value.closesAt}
                onChange={(event) => set("closesAt", event.target.value)}
                className="h-11"
              />
            )}
          </FieldShell>
        )}
      </div>

      <ToggleRow
        id="settings-allow-change"
        label="Let voters change their vote"
        description="Voters can update or withdraw their answer while the poll is open."
        checked={value.allowVoteChange}
        onChange={(checked) => set("allowVoteChange", checked)}
      />
      <ToggleRow
        id="settings-anonymous"
        label="Anonymous voting"
        description="Names aren't asked for or shown, not even to you."
        checked={value.isAnonymous}
        onChange={(checked) => set("isAnonymous", checked)}
      />
      <ToggleRow
        id="settings-require-login"
        label="Require sign-in to vote"
        description="Stops people voting twice from different browsers."
        checked={value.requireLogin}
        onChange={(checked) => set("requireLogin", checked)}
      />

      <FieldSet>
        <FieldLegend variant="label">Who can see results</FieldLegend>
        <RadioGroup
          value={value.resultsVisibility}
          onValueChange={(next) => set("resultsVisibility", next as ResultsVisibility)}
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <Field key={option.value} orientation="horizontal">
              <RadioGroupItem value={option.value} id={`visibility-${option.value}`} />
              <FieldContent>
                <FieldLabel htmlFor={`visibility-${option.value}`} className="font-normal">
                  {option.label}
                </FieldLabel>
                <FieldDescription>{option.description}</FieldDescription>
              </FieldContent>
            </Field>
          ))}
        </RadioGroup>
        <FieldError errors={errors["settings.resultsVisibility"]?.map((message) => ({ message }))} />
      </FieldSet>

      <FieldShell
        label="Expected participants (optional)"
        description="How many people you're asking. Used to show the response rate."
        errors={errors["settings.expectedParticipants"]}
      >
        {(control) => (
          <Input
            {...control}
            type="number"
            inputMode="numeric"
            min={1}
            value={value.expectedParticipants}
            onChange={(event) => set("expectedParticipants", event.target.value)}
            className="h-11 w-32"
          />
        )}
      </FieldShell>
    </div>
  );
}
