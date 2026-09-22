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
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ClosePollDialog({ pollId }: { pollId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const close = () =>
    startTransition(async () => {
      const result = await closePollAction(pollId);
      if (!result.ok) {
        toast.error(result.message);
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
            Nobody will be able to vote or change their vote. You can reopen it later if the deadline hasn&apos;t passed.
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

export function ReopenPollButton({ pollId }: { pollId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const reopen = () =>
    startTransition(async () => {
      const result = await reopenPollAction(pollId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Poll reopened");
      router.refresh();
    });

  return (
    <Button variant="outline" size="lg" onClick={reopen} disabled={pending}>
      {pending ? <Spinner data-icon="inline-start" /> : <LockOpenIcon data-icon="inline-start" />}
      Reopen
    </Button>
  );
}
