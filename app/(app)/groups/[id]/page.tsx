import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { DeleteGroupDialog, GroupMembersEditor, RenameGroupDialog } from "@/components/groups/group-controls";
import { BoardSection } from "@/components/insights/board-section";
import { AppPage } from "@/components/layout/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { PrivatePill } from "@/components/poll/private-pill";
import { StatusBadge } from "@/components/poll/status-badge";
import { BackLink } from "@/components/shared/back-link";
import { QueryToast } from "@/components/shared/query-toast";
import { requirePageGroupOwner } from "@/lib/auth/guards";
import { getGroupDetail } from "@/lib/groups/service";
import { plural } from "@/lib/insights/outcome";

export const metadata: Metadata = { title: "Group", robots: { index: false } };

export default async function GroupPage({ params }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const { group: base } = await requirePageGroupOwner(id, `/groups/${id}`);
  const group = await getGroupDetail(base.id);
  const now = new Date();

  return (
    <AppPage>
      <QueryToast param="created" value="1" message="Group created" />
      <PageHeader
        above={<BackLink href="/groups">Groups</BackLink>}
        title={group.name}
        description={`${plural(group.members.length, "person", "people")}. Only you can see this group.`}
        actions={
          <>
            <RenameGroupDialog groupId={group.id} name={group.name} />
            <DeleteGroupDialog groupId={group.id} name={group.name} pollCount={group.polls.length} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <BoardSection id="members-heading" title="People" count={group.members.length}>
          <GroupMembersEditor
            groupId={group.id}
            members={group.members.map((member) => ({ key: member.email, ...member }))}
          />
        </BoardSection>

        <BoardSection
          id="polls-heading"
          title="Shared with"
          count={group.polls.length}
          description={group.polls.length === 0 ? "Share a private poll with this group from its manage page." : undefined}
        >
          {group.polls.length > 0 && (
            <ul className="-mx-2 flex flex-col">
              {group.polls.map((poll) => (
                <li key={poll.id}>
                  <Link
                    href={`/polls/${poll.id}/manage`}
                    className="group flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/35"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-sm font-medium group-hover:text-signal-ink">{poll.title}</span>
                      <span className="flex flex-wrap gap-1.5">
                        <StatusBadge poll={poll} now={now} />
                        {/* Access through a group only counts while the poll is private. */}
                        {poll.visibility === "PRIVATE" ? (
                          <PrivatePill />
                        ) : (
                          <span className="text-xs leading-6 text-muted-foreground">Public now</span>
                        )}
                      </span>
                    </span>
                    <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BoardSection>
      </div>
    </AppPage>
  );
}
