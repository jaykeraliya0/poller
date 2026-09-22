"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { resendVerificationAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type ResendVerificationButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick"> & { email: string };

/** Sends a fresh confirmation link; stays disabled after a successful send so it isn't hammered. */
export function ResendVerificationButton({ email, children = "Resend link", ...props }: ResendVerificationButtonProps) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const resend = () =>
    startTransition(async () => {
      const result = await resendVerificationAction();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSent(true);
      toast.success(`Sent a new link to ${email}.`);
    });

  return (
    <Button type="button" variant="outline" disabled={pending || sent} onClick={resend} {...props}>
      {pending && <Spinner data-icon="inline-start" />}
      {sent ? "Link sent" : children}
    </Button>
  );
}
