import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, PlusIcon, UsersIcon } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryToast } from "@/components/shared/query-toast";
import { requirePageUser } from "@/lib/auth/guards";
import { listGroups } from "@/lib/groups/service";
import { plural } from "@/lib/insights/outcome";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage() {
  const user = await requirePageUser("/groups");
  const groups = await listGroups(user.id);

  const newButton = (
    <ButtonLink href="/groups/new" size="lg">
      <PlusIcon data-icon="inline-start" aria-hidden />
      New group
    </ButtonLink>
  );

  return (
    <AppPage>
      <QueryToast param="deleted" value="1" message="Group deleted" />
      <PageHeader
        title="Groups"
        description="People you poll often. Share a private poll with a whole group at once. Only you can see these."
        actions={groups.length > 0 && newButton}
      />
      {groups.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No groups yet"
          description="Make one for your team, family or club. Adding someone later gives them every poll the group is on."
        >
          {newButton}
        </EmptyState>
      ) : (
        <ul className="panel divide-y overflow-hidden">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="group flex items-center gap-4 px-4 py-3.5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-inset sm:px-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-signal-wash text-signal">
                  <UsersIcon className="size-4" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-semibold group-hover:text-signal-ink">{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {plural(group._count.members, "person", "people")} · on {plural(group._count.polls, "poll")}
                  </span>
                </span>
                <ChevronRightIcon
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppPage>
  );
}
