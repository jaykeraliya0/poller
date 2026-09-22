import { LockIcon, LogInIcon } from "lucide-react";
import { ResendVerificationButton } from "@/components/account/resend-verification-button";
import { PageContainer } from "@/components/layout/page-container";
import { ButtonLink } from "@/components/shared/button-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AccessDenial } from "@/lib/poll/permissions";

type PrivatePollNoticeProps = {
  reason: AccessDenial;
  /** Where to come back to after signing in. */
  path: string;
  signedInAs: string | null;
};

/** Shown instead of a private poll. Says nothing about the poll itself, not even its title. */
export function PrivatePollNotice({ reason, path, signedInAs }: PrivatePollNoticeProps) {
  return (
    <PageContainer className="flex flex-col gap-7 py-7 lg:py-10">
      <Alert className="max-w-2xl">
        <LockIcon aria-hidden />
        {reason === "LOGIN_REQUIRED" ? (
          <>
            <AlertTitle>This poll is private</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              Only people the organiser invited can open it. Sign in with the email address you were invited with.
              <ButtonLink href={`/login?next=${encodeURIComponent(path)}`} size="lg">
                <LogInIcon data-icon="inline-start" aria-hidden />
                Sign in
              </ButtonLink>
            </AlertDescription>
          </>
        ) : reason === "EMAIL_UNVERIFIED" ? (
          <>
            <AlertTitle>Confirm your email to open this poll</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              This poll is private. Invites only count once you&apos;ve confirmed you own{" "}
              <strong className="font-medium text-foreground">{signedInAs}</strong>: follow the link we emailed you, then
              come back here.
              <ResendVerificationButton email={signedInAs ?? ""} size="lg">
                Resend confirmation email
              </ResendVerificationButton>
            </AlertDescription>
          </>
        ) : (
          <>
            <AlertTitle>You&apos;re not on the invite list</AlertTitle>
            <AlertDescription>
              This poll is private. You&apos;re signed in as <strong className="font-medium text-foreground">{signedInAs}</strong>
              . Ask the organiser to invite that address, or sign in with the one they invited.
            </AlertDescription>
          </>
        )}
      </Alert>
    </PageContainer>
  );
}
