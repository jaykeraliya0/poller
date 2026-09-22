"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheckIcon } from "lucide-react";
import { forgotPasswordAction } from "@/actions/auth";
import { TextField } from "@/components/forms/text-field";
import { FormAlert } from "@/components/shared/form-alert";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-5">
        <Alert aria-live="polite">
          <MailCheckIcon aria-hidden />
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>
            If an account uses <strong className="font-medium text-foreground">{state.email}</strong>, we&apos;ve sent it a
            link to choose a new password. The link works once and expires in 1 hour.
          </AlertDescription>
        </Alert>
        <BackToSignIn />
      </div>
    );
  }

  const errors = state?.fieldErrors ?? {};
  const formMessage = state && !state.fieldErrors ? state.message : null;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formMessage} />
      <FieldGroup>
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={state?.values?.email}
          errors={errors.email}
          required
        />
      </FieldGroup>
      <SubmitButton pendingLabel="Sending…">Email me a reset link</SubmitButton>
      <BackToSignIn />
    </form>
  );
}

function BackToSignIn() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Remembered it?{" "}
      <Link href="/login" className="font-medium text-signal-ink underline-offset-4 hover:underline">
        Sign in
      </Link>
    </p>
  );
}
