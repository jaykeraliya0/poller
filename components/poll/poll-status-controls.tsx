"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockIcon, LockOpenIcon } from "lucide-react";
import { toast } from "sonner";
import { closePollAction, reopenPollAction } from "@/actions/polls";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FieldShell } from "@/components/forms/field-shell";
import { toLocalInputValue } from "@/components/poll-form/settings-panel";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

export function ClosePollDialog({ pollId }: { pollId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const close = () =>
    startTransition(async () => {
      const result = await closePollAction(pollId);
      if (!result.ok) {
        toast.error(result.message);
        // The deadline passed or another tab closed it: show the closed state.
        if (result.code === "ALREADY_CLOSED") {
          setOpen(false);
          router.refresh();
        }
        return;
      }
      setOpen(false);
      toast.success("Poll closed. These are the final results.");
      router.refresh();
    });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="lg" />}>
        <LockIcon data-icon="inline-start" />
        Close poll
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close voting now?</AlertDialogTitle>
          <AlertDialogDescription>
            Nobody will be able to vote or change their vote, and the poll can&apos;t be edited while it&apos;s closed.
            You can reopen it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep open</AlertDialogCancel>
          <AlertDialogAction onClick={close} disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            Close poll
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type ReopenPollButtonProps = {
  pollId: string;
  /** The deadline has passed, so reopening needs a new one (or none). */
  needsDeadline: boolean;
};

export function ReopenPollButton({ pollId, needsDeadline }: ReopenPollButtonProps) {
  const [open, setOpen] = useState(false);
  const [hasDeadline, setHasDeadline] = useState(true);
  const [closesAt, setClosesAt] = useState("");
  const [errors, setErrors] = useState<string[] | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const reopen = (input: { closesAt?: string | null } = {}) =>
    startTransition(async () => {
      const result = await reopenPollAction(pollId, input);
      if (!result.ok) {
        if (result.fieldErrors) return setErrors(result.fieldErrors.closesAt ?? [result.message]);
        toast.error(result.message);
        // Someone else may have changed the poll: show its current state.
        if (result.code === "CONFLICT") router.refresh();
        return;
      }
      setOpen(false);
      toast.success("Poll reopened");
      router.refresh();
    });

  const trigger = (
    <>
      {pending && !open ? <Spinner data-icon="inline-start" /> : <LockOpenIcon data-icon="inline-start" />}
      Reopen
    </>
  );

  if (!needsDeadline) {
    return (
      <Button variant="outline" size="lg" onClick={() => reopen()} disabled={pending}>
        {trigger}
      </Button>
    );
  }

  const onOpenChange = (next: boolean) => {
    if (next) {
      // Default to the same time tomorrow, in the owner's local time.
      setClosesAt(toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
      setHasDeadline(true);
      setErrors(undefined);
    }
    setOpen(next);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const deadline = hasDeadline ? new Date(closesAt) : null;
    if (deadline && Number.isNaN(deadline.getTime())) return setErrors(["Pick a valid date and time"]);
    if (deadline && deadline.getTime() <= Date.now()) return setErrors(["Deadline must be in the future"]);
    reopen({ closesAt: deadline ? deadline.toISOString() : null });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger render={<Button variant="outline" size="lg" />}>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen voting?</AlertDialogTitle>
            <AlertDialogDescription>
              The deadline has passed. Pick a new one, or reopen without a deadline and close the poll yourself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="reopen-has-deadline">Set a new deadline</FieldLabel>
            <Switch
              id="reopen-has-deadline"
              checked={hasDeadline}
              onCheckedChange={(checked) => {
                setHasDeadline(checked);
                setErrors(undefined);
              }}
            />
          </Field>
          {hasDeadline && (
            <FieldShell label="Closes at" errors={errors}>
              {(control) => (
                <Input
                  {...control}
                  type="datetime-local"
                  value={closesAt}
                  onChange={(event) => {
                    setClosesAt(event.target.value);
                    setErrors(undefined);
                  }}
                />
              )}
            </FieldShell>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep closed</AlertDialogCancel>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Reopen poll
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
