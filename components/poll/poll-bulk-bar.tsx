"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon, ArchiveRestoreIcon, LockIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { bulkPollAction, type BulkPollAction } from "@/actions/polls";
import { StickyActionBar } from "@/components/shared/sticky-action-bar";
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
import { Spinner } from "@/components/ui/spinner";
import { plural } from "@/lib/insights/outcome";

type PollBulkBarProps = {
  selectedIds: string[];
  /** On the archived list the actions are unarchive and delete; elsewhere close, archive and delete. */
  archivedView: boolean;
  onDone: () => void;
};

const DONE: Record<BulkPollAction, string> = {
  close: "Closed",
  archive: "Archived",
  unarchive: "Unarchived",
  delete: "Deleted",
};

/** Actions for the polls ticked on the dashboard. Pinned to the bottom on phones. */
export function PollBulkBar({ selectedIds, archivedView, onDone }: PollBulkBarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<BulkPollAction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selected = plural(selectedIds.length, "poll");

  const run = (action: BulkPollAction) =>
    startTransition(async () => {
      setRunning(action);
      const result = await bulkPollAction(action, selectedIds);
      setRunning(null);
      setConfirmDelete(false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const { count } = result.data;
      const skipped = selectedIds.length - count;
      toast.success(
        count === 0
          ? `Nothing to ${action}: ${selectedIds.length === 1 ? "that poll is" : "those polls are"} already done.`
          : `${DONE[action]} ${plural(count, "poll")}${skipped > 0 ? ` (${skipped} already ${action === "close" ? "closed" : "done"})` : ""}.`,
      );
      onDone();
      router.refresh();
    });

  const icon = (action: BulkPollAction, Icon: typeof LockIcon) =>
    running === action ? <Spinner data-icon="inline-start" /> : <Icon data-icon="inline-start" aria-hidden />;

  return (
    <>
      <StickyActionBar className="sm:rounded-[14px] sm:border sm:bg-panel sm:px-3 sm:py-2">
        <div role="toolbar" aria-label="Actions for selected polls" className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-medium tabular-nums" aria-live="polite">
            {selected} selected
          </p>
          {archivedView ? (
            <Button variant="outline" disabled={pending} onClick={() => run("unarchive")}>
              {icon("unarchive", ArchiveRestoreIcon)}
              Unarchive
            </Button>
          ) : (
            <>
              <Button variant="outline" disabled={pending} onClick={() => run("close")}>
                {icon("close", LockIcon)}
                Close
              </Button>
              <Button variant="outline" disabled={pending} onClick={() => run("archive")}>
                {icon("archive", ArchiveIcon)}
                Archive
              </Button>
            </>
          )}
          <Button variant="outline" className="text-destructive" disabled={pending} onClick={() => setConfirmDelete(true)}>
            <Trash2Icon data-icon="inline-start" aria-hidden />
            Delete
          </Button>
          <Button variant="ghost" size="icon" aria-label="Clear selection" disabled={pending} onClick={onDone}>
            <XIcon />
          </Button>
        </div>
      </StickyActionBar>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {selectedIds.length === 1 ? "the poll and its" : "these polls and all their"} votes,
              and the links stop working. {archivedView ? "" : "Archiving keeps them out of the way without losing anything."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => run("delete")} disabled={pending}>
              {running === "delete" && <Spinner data-icon="inline-start" />}
              Delete {selected}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
