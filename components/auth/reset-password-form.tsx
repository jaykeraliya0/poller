"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/actions/auth";
import { TextField } from "@/components/forms/text-field";
import { FormAlert } from "@/components/shared/form-alert";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { PASSWORD_MIN } from "@/lib/validation/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, null);
  const errors = state?.fieldErrors ?? {};
  const formMessage = state && !state.fieldErrors ? state.message : null;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormAlert message={formMessage} />
      <FieldGroup>
        <TextField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          description={`At least ${PASSWORD_MIN} characters. This signs you out on every other device.`}
          errors={errors.password}
          required
        />
      </FieldGroup>
      <SubmitButton pendingLabel="Saving…">Set new password</SubmitButton>
    </form>
  );
}
