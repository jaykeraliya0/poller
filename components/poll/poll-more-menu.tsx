"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  BracesIcon,
  ChartColumnIcon,
  EllipsisIcon,
  FileTextIcon,
  ImageIcon,
  SheetIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { archivePollAction, deletePollAction, unarchivePollAction } from "@/actions/polls";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { plural } from "@/lib/insights/outcome";
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/poll/export-formats";

type PollMoreMenuProps = { pollId: string; title: string; responseCount: number; archived: boolean };

const EXPORT_ICONS: Record<ExportFormat, typeof SheetIcon> = {
  csv: SheetIcon,
  json: BracesIcon,
  "results-pdf": FileTextIcon,
  "results-png": ImageIcon,
  "analytics-pdf": ChartColumnIcon,
};

export function PollMoreMenu({ pollId, title, responseCount, archived }: PollMoreMenuProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      // Redirects to the dashboard on success; returns only on failure.
      const failure = await deletePollAction(pollId);
      toast.error(failure.message);
    });

  const toggleArchive = () =>
    startTransition(async () => {
      const result = await (archived ? unarchivePollAction : archivePollAction)(pollId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(archived ? "Poll unarchived" : "Poll archived. It's closed and off your main list.");
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon-lg" aria-label="More actions" />}>
          {pending && !confirmOpen ? <Spinner /> : <EllipsisIcon />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Export</DropdownMenuLabel>
            {/* Plain download links: the route handler builds each file. */}
            {EXPORT_FORMATS.map(({ format, label }) => {
              const Icon = EXPORT_ICONS[format];
              return (
                <DropdownMenuItem key={format} render={<a href={`/api/polls/${pollId}/export?format=${format}`} download />}>
                  <Icon aria-hidden />
                  {label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleArchive} disabled={pending}>
            {archived ? <ArchiveRestoreIcon aria-hidden /> : <ArchiveIcon aria-hidden />}
            {archived ? "Unarchive poll" : "Archive poll"}
          </DropdownMenuItem>
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
                ? `This permanently deletes the poll and ${plural(responseCount, "response")}.`
                : "This permanently deletes the poll. The link will stop working."}
              {archived ? " Consider exporting it first." : " To keep it but get it out of the way, archive it instead."}
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
