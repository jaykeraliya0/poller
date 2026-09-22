"use client";

import { useId } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

export type ControlProps = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

type FieldShellProps = {
  label: React.ReactNode;
  description?: React.ReactNode;
  errors?: string[];
  id?: string;
  className?: string;
  /** Receives the id/aria props to spread onto the actual control. */
  children: (control: ControlProps) => React.ReactNode;
};

/** Label + control + description/error, with ids wired up for screen readers. */
export function FieldShell({ label, description, errors, id, className, children }: FieldShellProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const invalid = Boolean(errors?.length);
  const describedBy = invalid ? `${controlId}-error` : description ? `${controlId}-description` : undefined;

  return (
    <Field data-invalid={invalid || undefined} className={className}>
      <FieldLabel htmlFor={controlId}>{label}</FieldLabel>
      {children({
        id: controlId,
        ...(invalid && { "aria-invalid": true as const }),
        ...(describedBy && { "aria-describedby": describedBy }),
      })}
      {description && !invalid && (
        <FieldDescription id={`${controlId}-description`}>{description}</FieldDescription>
      )}
      <FieldError id={`${controlId}-error`} errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}
