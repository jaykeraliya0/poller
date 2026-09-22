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
import type { PollVisibility, ResultsVisibility } from "@/generated/prisma/enums";
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
  visibility: PollVisibility;
  expectedParticipants: string;
};

export const DEFAULT_SETTINGS_DRAFT: SettingsDraft = {
  hasDeadline: false,
  closesAt: "",
  allowVoteChange: true,
  isAnonymous: false,
  requireLogin: false,
  resultsVisibility: "PUBLIC",
  visibility: "PUBLIC",
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
    visibility: draft.visibility,
    expectedParticipants: draft.expectedParticipants.trim() === "" ? null : Number(draft.expectedParticipants),
  };
}

type RadioOption<T extends string> = { value: T; label: string; description: string };

const ACCESS_OPTIONS: RadioOption<PollVisibility>[] = [
  { value: "PUBLIC", label: "Anyone with the link", description: "Share the link and anyone who has it can vote." },
  {
    value: "PRIVATE",
    label: "Only people I invite",
    description: "Invite people or your groups after saving. They sign in to vote.",
  },
];

function resultsOptions(visibility: PollVisibility): RadioOption<ResultsVisibility>[] {
  return [
    {
      value: "PUBLIC",
      label: visibility === "PRIVATE" ? "Everyone invited" : "Anyone with the link",
      description: "Results are visible at any time.",
    },
    { value: "AFTER_VOTE", label: "After voting", description: "People see results once they've voted." },
    { value: "AFTER_CLOSE", label: "After the poll closes", description: "Nobody is swayed by early results." },
    { value: "OWNER_ONLY", label: "Only me", description: "Voters never see the results." },
  ];
}

type RadioCardsProps<T extends string> = {
  name: string;
  legend: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  errors?: string[];
};

function RadioCards<T extends string>({ name, legend, options, value, onChange, errors }: RadioCardsProps<T>) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <RadioGroup value={value} onValueChange={(next) => onChange(next as T)} className="gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <FieldLabel key={option.value} htmlFor={`${name}-${option.value}`} className="font-normal">
            <Field orientation="horizontal">
              <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
              <FieldContent>
                <span className="text-sm font-medium">{option.label}</span>
                <FieldDescription>{option.description}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </FieldSet>
  );
}

type ToggleRowProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleRow({ id, label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <Field orientation="horizontal" className="px-4 py-3.5">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </Field>
  );
}

type SettingsPanelProps = {
  value: SettingsDraft;
  onChange: (value: SettingsDraft) => void;
  errors: FieldErrors;
  /** Anonymity can't change once people have voted. */
  anonymityLocked?: boolean;
};

export function SettingsPanel({ value, onChange, errors, anonymityLocked = false }: SettingsPanelProps) {
  const set = <K extends keyof SettingsDraft>(key: K, next: SettingsDraft[K]) => onChange({ ...value, [key]: next });
  const isPrivate = value.visibility === "PRIVATE";

  return (
    <div className="flex flex-col gap-6">
      <RadioCards
        name="access"
        legend="Who can vote"
        options={ACCESS_OPTIONS}
        value={value.visibility}
        onChange={(next) => set("visibility", next)}
        errors={errors["settings.visibility"]}
      />

      <div className="divide-y rounded-[12px] border">
        <div className="flex flex-col">
          <ToggleRow
            id="settings-deadline"
            label="Set a deadline"
            description="Voting closes automatically. You can also close it early."
            checked={value.hasDeadline}
            onChange={(checked) => set("hasDeadline", checked)}
          />
          {value.hasDeadline && (
            <div className="px-4 pb-4">
              <FieldShell label="Closes at" errors={errors["settings.closesAt"]}>
                {(control) => (
                  <Input
                    {...control}
                    type="datetime-local"
                    value={value.closesAt}
                    onChange={(event) => set("closesAt", event.target.value)}
                    className="sm:max-w-64"
                  />
                )}
              </FieldShell>
            </div>
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
          description={
            anonymityLocked
              ? "Locked because people have already voted."
              : "Names aren't asked for or shown, not even to you."
          }
          checked={value.isAnonymous}
          disabled={anonymityLocked}
          onChange={(checked) => set("isAnonymous", checked)}
        />
        <ToggleRow
          id="settings-require-login"
          label="Require sign-in to vote"
          description={
            isPrivate ? "Private polls always ask voters to sign in." : "Stops people voting twice from different browsers."
          }
          // Shown on, but the saved choice is kept for if the poll goes public again.
          checked={isPrivate || value.requireLogin}
          disabled={isPrivate}
          onChange={(checked) => set("requireLogin", checked)}
        />
      </div>

      <RadioCards
        name="visibility"
        legend="Who can see results"
        options={resultsOptions(value.visibility)}
        value={value.resultsVisibility}
        onChange={(next) => set("resultsVisibility", next)}
        errors={errors["settings.resultsVisibility"]}
      />

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
            className="max-w-32"
          />
        )}
      </FieldShell>
    </div>
  );
}

/** `datetime-local` value (local time) for a saved deadline. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
