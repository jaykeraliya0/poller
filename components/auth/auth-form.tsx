"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/actions/auth";
import { TextField } from "@/components/forms/text-field";
import { FormAlert } from "@/components/shared/form-alert";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { PASSWORD_MIN } from "@/lib/validation/auth";

type AuthFormProps = { mode: "login" | "register"; next?: string };

export function AuthForm({ mode, next }: AuthFormProps) {
  const isRegister = mode === "register";
  const [state, formAction] = useActionState(isRegister ? registerAction : loginAction, null);

  const errors = state?.fieldErrors ?? {};
  const values = (state?.values ?? {}) as { name?: string; email?: string };
  // Field errors are shown inline; only show the banner for form-level problems.
  const formMessage = state && !state.fieldErrors ? state.message : null;
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormAlert message={formMessage} />

      <FieldGroup>
        {isRegister && (
          <TextField
            label="Name"
            name="name"
            autoComplete="name"
            defaultValue={values.name}
            errors={errors.name}
            required
          />
        )}
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={values.email}
          errors={errors.email}
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          description={isRegister ? `At least ${PASSWORD_MIN} characters.` : undefined}
          errors={errors.password}
          required
        />
      </FieldGroup>

      <SubmitButton pendingLabel={isRegister ? "Creating account…" : "Signing in…"}>
        {isRegister ? "Create account" : "Sign in"}
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? "Already have an account? " : "New to Poller? "}
        <Link
          href={`${isRegister ? "/login" : "/register"}${nextQuery}`}
          className="font-medium text-signal-ink underline-offset-4 hover:underline"
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
