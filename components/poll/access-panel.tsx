"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { addInvitesAction, removeInviteAction, setPollGroupsAction } from "@/actions/invites";
import { EmailListEditor } from "@/components/shared/email-list-editor";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import type { PollAccess } from "@/lib/poll/invites";

type AccessPanelProps = { pollId: string; access: PollAccess };

/** Who may open a private poll: people invited by email, plus any of the owner's groups. */
export function AccessPanel({ pollId, access }: AccessPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const linkedIds = access.groups.filter((group) => group.linked).map((group) => group.id);
  const [optimisticIds, setOptimisticIds] = useOptimistic(linkedIds);

  const toggleGroup = (groupId: string, checked: boolean) => {
    const next = checked ? [...optimisticIds, groupId] : optimisticIds.filter((id) => id !== groupId);
    startTransition(async () => {
      setOptimisticIds(next);
      const result = await setPollGroupsAction(pollId, next);
      if (!result.ok) toast.error(result.message);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <FieldSet className="gap-3">
        <FieldLegend variant="label">Groups</FieldLegend>
        {access.groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Save people you poll often as a group.{" "}
            <Link href="/groups/new" className="font-medium text-foreground underline underline-offset-4">
              Create a group
            </Link>
          </p>
        ) : (
          <div role="group" aria-label="Groups" className="flex flex-col gap-1.5">
            {access.groups.map((group) => (
              <FieldLabel
                key={group.id}
                htmlFor={`group-${group.id}`}
                className="flex min-h-11 w-full items-center gap-3 rounded-[10px] border px-3 font-normal"
              >
                <Checkbox
                  id={`group-${group.id}`}
                  checked={optimisticIds.includes(group.id)}
                  onCheckedChange={(checked) => toggleGroup(group.id, checked)}
                />
                <UsersIcon className="size-4 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{group.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {group.memberCount} {group.memberCount === 1 ? "person" : "people"}
                </span>
              </FieldLabel>
            ))}
          </div>
        )}
      </FieldSet>

      <EmailListEditor
        label="Invite by email"
        description="Separate addresses with commas or new lines. People without an account get access once they sign up with that email."
        entries={access.invites.map((invite) => ({ key: invite.id, email: invite.email, hasAccount: invite.hasAccount }))}
        emptyText="No one invited directly yet."
        noun="invite"
        onAdd={(emails) => addInvitesAction(pollId, emails)}
        onRemove={(inviteId) => removeInviteAction(pollId, inviteId)}
      />
    </div>
  );
}
