"use client";

import { useActionState } from "react";
import { createGroupAction } from "@/actions/groups";
import { TextField, TextareaField } from "@/components/forms/text-field";
import { FormAlert } from "@/components/shared/form-alert";
import { SubmitButton } from "@/components/shared/submit-button";
import { GROUP_NAME_MAX } from "@/lib/validation/group";

export function CreateGroupForm() {
  const [state, formAction] = useActionState(createGroupAction, null);
  return (
    <form action={formAction} className="panel flex max-w-xl flex-col gap-5 p-5 sm:p-6" noValidate>
      <FormAlert message={state && !state.fieldErrors ? state.message : null} />
      <TextField
        label="Name"
        name="name"
        maxLength={GROUP_NAME_MAX}
        placeholder="Design team"
        autoComplete="off"
        defaultValue={state?.values?.name}
        errors={state?.fieldErrors?.name}
      />
      <TextareaField
        label="People (optional)"
        name="emails"
        description="Email addresses, separated by commas or new lines. You can add more later."
        placeholder="ana@example.com, ben@example.com"
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        className="font-mono text-[0.8125rem]"
        defaultValue={state?.values?.emails}
        errors={state?.fieldErrors?.emails}
      />
      <SubmitButton pendingLabel="Creating…" className="sm:w-auto sm:self-start">
        Create group
      </SubmitButton>
    </form>
  );
}
