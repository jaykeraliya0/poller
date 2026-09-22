"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { addMembersAction, deleteGroupAction, removeMemberAction, renameGroupAction } from "@/actions/groups";
import { FieldShell } from "@/components/forms/field-shell";
import { EmailListEditor, type EmailEntry } from "@/components/shared/email-list-editor";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { GROUP_NAME_MAX } from "@/lib/validation/group";

export function RenameGroupDialog({ groupId, name }: { groupId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [errors, setErrors] = useState<string[] | undefined>();
  const [pending, startTransition] = useTransition();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setValue(name);
      setErrors(undefined);
    }
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameGroupAction(groupId, value);
      if (!result.ok) {
        setErrors(result.fieldErrors?.name ?? [result.message]);
        return;
      }
      setOpen(false);
      toast.success("Group renamed");
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="lg" />}>
        <PencilIcon data-icon="inline-start" />
        Rename
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={save} className="flex flex-col gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>Rename group</DialogTitle>
          </DialogHeader>
          <FieldShell label="Name" errors={errors}>
            {(control) => (
              <Input {...control} value={value} maxLength={GROUP_NAME_MAX} onChange={(event) => setValue(event.target.value)} />
            )}
          </FieldShell>
          <Button type="submit" size="lg" disabled={pending} className="sm:self-end">
            {pending && <Spinner data-icon="inline-start" />}
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteGroupDialog({ groupId, name, pollCount }: { groupId: string; name: string; pollCount: number }) {
  const [pending, startTransition] = useTransition();
  const remove = () =>
    startTransition(async () => {
      // Redirects to the groups list on success; returns only on failure.
      const failure = await deleteGroupAction(groupId);
      toast.error(failure.message);
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="icon-lg" aria-label="Delete group" />}>
        <Trash2Icon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            {pollCount > 0
              ? `Its members lose access to the ${pollCount === 1 ? "poll" : `${pollCount} polls`} it's shared with, unless you invited them directly. Their votes stay.`
              : "The group isn't shared with any polls."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={remove} disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            Delete group
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function GroupMembersEditor({ groupId, members }: { groupId: string; members: EmailEntry[] }) {
  return (
    <EmailListEditor
      label="Add people"
      description="Separate addresses with commas or new lines. They get access to every poll this group is shared with."
      entries={members}
      emptyText="No one in this group yet."
      noun="member"
      onAdd={(emails) => addMembersAction(groupId, emails)}
      onRemove={(email) => removeMemberAction(groupId, email)}
    />
  );
}
