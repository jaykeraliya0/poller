import type { Metadata } from "next";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { AppPage } from "@/components/layout/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { requirePageUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "New group" };

export default async function NewGroupPage() {
  await requirePageUser("/groups/new");
  return (
    <AppPage>
      <PageHeader
        above={<BackLink href="/groups">Groups</BackLink>}
        title="New group"
        description="Save people you poll often, then share private polls with all of them at once. Only you can see your groups."
      />
      <CreateGroupForm />
    </AppPage>
  );
}
