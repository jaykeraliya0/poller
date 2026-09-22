"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FieldShell } from "./field-shell";

type SharedProps = {
  label: string;
  description?: React.ReactNode;
  errors?: string[];
};

export function TextField({
  label,
  description,
  errors,
  id,
  className,
  ...inputProps
}: SharedProps & React.ComponentProps<typeof Input>) {
  return (
    <FieldShell label={label} description={description} errors={errors} id={id}>
      {(control) => <Input className={cn("h-11", className)} {...control} {...inputProps} />}
    </FieldShell>
  );
}

export function TextareaField({
  label,
  description,
  errors,
  id,
  className,
  ...textareaProps
}: SharedProps & React.ComponentProps<typeof Textarea>) {
  return (
    <FieldShell label={label} description={description} errors={errors} id={id}>
      {(control) => <Textarea className={cn("min-h-20", className)} {...control} {...textareaProps} />}
    </FieldShell>
  );
}
