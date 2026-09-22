"use client";

import { useState, useTransition } from "react";
import { DownloadIcon, EllipsisIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deletePollAction } from "@/actions/polls";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { plural } from "@/lib/insights/outcome";

type PollMoreMenuProps = { pollId: string; title: string; responseCount: number };

export function PollMoreMenu({ pollId, title, responseCount }: PollMoreMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      // Redirects to the dashboard on success; returns only on failure.
      const failure = await deletePollAction(pollId);
      toast.error(failure.message);
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" className="size-11" aria-label="More actions" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* A plain download link: the route handler streams the CSV. */}
          <DropdownMenuItem render={<a href={`/api/polls/${pollId}/export`} download />}>
            <DownloadIcon aria-hidden />
            Download responses (CSV)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2Icon aria-hidden />
            Delete poll
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              {responseCount > 0
                ? `This permanently deletes the poll and ${plural(responseCount, "response")}. Consider downloading the CSV first.`
                : "This permanently deletes the poll. The link will stop working."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove} disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Delete poll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
