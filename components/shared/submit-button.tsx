"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  pendingLabel?: string;
};

/** Disabled while its form is submitting, which also stops double submits. */
export function SubmitButton({ children, pendingLabel, disabled, className, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      className={cn("h-11 w-full", className)}
      {...props}
    >
      {pending && <Spinner data-icon="inline-start" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
