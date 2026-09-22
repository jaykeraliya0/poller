"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRingIcon } from "lucide-react";
import { toast } from "sonner";
import { sendRemindersAction } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type ReminderControlProps = {
  pollId: string;
  pending: number;
  /** "in 3 hours" while the cooldown runs, otherwise null. */
  nextReminderIn: string | null;
};

/** Emails everyone invited who hasn't voted yet. */
export function ReminderControl({ pollId, pending, nextReminderIn }: ReminderControlProps) {
  const router = useRouter();
  const [sending, startTransition] = useTransition();
  const people = `${pending} ${pending === 1 ? "person hasn't" : "people haven't"}`;

  const send = () =>
    startTransition(async () => {
      const result = await sendRemindersAction(pollId);
      if (result.ok) toast.success(`Reminder on its way to ${result.data.pending === 1 ? "1 person" : `${result.data.pending} people`}.`);
      else toast.error(result.message);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5">
      <p className="min-w-0 flex-1 text-sm">
        {pending === 0 ? (
          <span className="text-muted-foreground">Everyone invited has voted.</span>
        ) : (
          <>
            <span className="font-medium">{people} voted yet.</span>
            {nextReminderIn && (
              <span className="text-muted-foreground"> You can send another reminder {nextReminderIn}.</span>
            )}
          </>
        )}
      </p>
      {pending > 0 && (
        <Button type="button" variant="outline" disabled={sending || nextReminderIn !== null} onClick={send}>
          {sending ? <Spinner data-icon="inline-start" /> : <BellRingIcon data-icon="inline-start" aria-hidden />}
          Email a reminder
        </Button>
      )}
    </div>
  );
}
