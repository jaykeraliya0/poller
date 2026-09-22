import type { Metadata } from "next";
import { CircleCheckIcon } from "lucide-react";
import { DeleteAccountForm } from "@/components/account/delete-account-form";
import { EmailNotificationsSwitch } from "@/components/account/email-notifications-switch";
import { ResendVerificationButton } from "@/components/account/resend-verification-button";
import { AppPage } from "@/components/layout/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePageUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };

function SettingsSection({ id, title, description, children, danger }: { id: string; title: string; description?: React.ReactNode; children: React.ReactNode; danger?: boolean }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t py-7 first:border-t-0 first:pt-0 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
      <div className="flex flex-col gap-1">
        <h2 id={id} className={danger ? "font-semibold text-destructive" : "font-semibold"}>
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requirePageUser("/settings");
  const { emailNotifications } = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { emailNotifications: true },
  });
  return (
    <AppPage className="max-w-[900px]">
      <PageHeader title="Settings" />

      <div className="flex flex-col">
        <SettingsSection id="account-heading" title="Account" description="The name voters see on polls you create.">
          <dl className="panel divide-y text-sm">
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-[6rem_1fr]">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium break-words">{user.name}</dd>
            </div>
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-[6rem_1fr]">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <span className="font-medium break-all">{user.email}</span>
                {user.emailVerified ? (
                  <Badge variant="outline">
                    <CircleCheckIcon aria-hidden />
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="outline">Not confirmed</Badge>
                )}
              </dd>
            </div>
          </dl>
        </SettingsSection>

        <SettingsSection
          id="email-heading"
          title="Email"
          description="Account emails, like password resets, always send. Poll emails are up to you."
        >
          <div className="flex flex-col gap-3">
            {!user.emailVerified && (
              <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  Confirm your address to create polls, open private polls you&apos;re invited to and get poll emails. Check your inbox
                  for the link.
                </p>
                <ResendVerificationButton email={user.email} />
              </div>
            )}
            <EmailNotificationsSwitch enabled={emailNotifications} />
          </div>
        </SettingsSection>

        <SettingsSection
          id="delete-heading"
          title="Delete account"
          danger
          description={
            <>
              Permanently deletes your account and every poll you created, including all their votes. Votes you cast on
              other people&apos;s polls stay, but are no longer linked to you. This can&apos;t be undone.
            </>
          }
        >
          <div className="panel border-destructive/25 p-4 sm:p-5">
            <DeleteAccountForm email={user.email} />
          </div>
        </SettingsSection>
      </div>
    </AppPage>
  );
}
