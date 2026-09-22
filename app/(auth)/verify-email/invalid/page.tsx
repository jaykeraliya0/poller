import type { Metadata } from "next";
import { LinkIcon } from "lucide-react";
import { ResendVerificationButton } from "@/components/account/resend-verification-button";
import { ButtonLink } from "@/components/shared/button-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Confirmation link expired" };

export default async function InvalidVerificationPage() {
  const user = await getCurrentUser();

  return (
    <>
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-tight font-bold">Confirm your email</h1>
      </div>
      <Alert>
        <LinkIcon aria-hidden />
        {user?.emailVerified ? (
          <>
            <AlertTitle>You&apos;re all set</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              {user.email} is already confirmed.
              <ButtonLink href="/dashboard" size="lg">
                Go to your polls
              </ButtonLink>
            </AlertDescription>
          </>
        ) : (
          <>
            <AlertTitle>This link doesn&apos;t work anymore</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              Confirmation links expire after 48 hours, and only the newest one works.
              {user ? (
                <ResendVerificationButton email={user.email} size="lg">
                  Send a new link
                </ResendVerificationButton>
              ) : (
                <>
                  Sign in and we&apos;ll offer to send a new one.
                  <ButtonLink href="/login?next=%2Fsettings" size="lg">
                    Sign in
                  </ButtonLink>
                </>
              )}
            </AlertDescription>
          </>
        )}
      </Alert>
    </>
  );
}
