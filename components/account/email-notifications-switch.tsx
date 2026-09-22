"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setEmailNotificationsAction } from "@/actions/account";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

export function EmailNotificationsSwitch({ enabled }: { enabled: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [, startTransition] = useTransition();

  const toggle = (checked: boolean) =>
    startTransition(async () => {
      setOptimistic(checked);
      const result = await setEmailNotificationsAction(checked);
      if (!result.ok) toast.error(result.message);
    });

  return (
    <Field orientation="horizontal" className="panel items-start justify-between gap-4 p-4">
      <FieldContent>
        <FieldLabel htmlFor="email-notifications">Poll emails</FieldLabel>
        <FieldDescription>
          Invitations to private polls, reminders before they close, and results once they do.
        </FieldDescription>
      </FieldContent>
      <Switch id="email-notifications" checked={optimistic} onCheckedChange={toggle} />
    </Field>
  );
}
