import { useId } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TextFieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  description?: string;
  errors?: string[];
};

/** Labelled input with description and inline errors wired up for screen readers. */
export function TextField({ label, description, errors, className, id, ...inputProps }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const invalid = Boolean(errors?.length);

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${inputId}-error` : description ? `${inputId}-description` : undefined}
        className={cn("h-11", className)}
        {...inputProps}
      />
      {description && !invalid && (
        <FieldDescription id={`${inputId}-description`}>{description}</FieldDescription>
      )}
      <FieldError id={`${inputId}-error`} errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}
