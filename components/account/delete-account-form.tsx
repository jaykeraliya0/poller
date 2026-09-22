"use client";

import { useActionState } from "react";
import { deleteAccountAction } from "@/actions/account";
import { TextField } from "@/components/forms/text-field";
import { FormAlert } from "@/components/shared/form-alert";
import { SubmitButton } from "@/components/shared/submit-button";

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(deleteAccountAction, null);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormAlert message={state && !state.fieldErrors ? state.message : null} />
      <TextField
        label={`Type ${email} to confirm`}
        name="confirmation"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={state?.values?.confirmation}
        errors={state?.fieldErrors?.confirmation}
      />
      <SubmitButton variant="destructive" pendingLabel="Deleting…" className="sm:w-auto sm:self-start">
        Delete my account
      </SubmitButton>
    </form>
  );
}
