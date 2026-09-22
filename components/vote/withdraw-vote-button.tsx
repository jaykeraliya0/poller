"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { withdrawVoteAction } from "@/actions/votes";
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

export function WithdrawVoteButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const withdraw = () =>
    startTransition(async () => {
      const result = await withdrawVoteAction(slug);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setOpen(false);
      toast.success("Your vote was withdrawn");
      router.refresh();
    });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" variant="ghost" size="lg" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" />}>
        Withdraw vote
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw your vote?</AlertDialogTitle>
          <AlertDialogDescription>
            Your answers and comment will be removed. You can vote again while the poll is open.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep my vote</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={withdraw} disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            Withdraw
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
