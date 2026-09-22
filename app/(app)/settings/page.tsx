import type { Metadata } from "next";
import { DeleteAccountForm } from "@/components/account/delete-account-form";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePageUser("/settings");
  return (
    <PageContainer className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="break-words">{user.name}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all">{user.email}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Delete account</CardTitle>
          <CardDescription>
            Permanently deletes your account and every poll you created, including all their votes. Votes you cast
            on other people&apos;s polls stay, but are no longer linked to you. This can&apos;t be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm email={user.email} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
