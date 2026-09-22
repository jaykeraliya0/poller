import type { Metadata } from "next";
import { LinkIcon } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ButtonLink } from "@/components/shared/button-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { INVALID_RESET_LINK } from "@/lib/auth/account-emails";
import { peekEmailToken } from "@/lib/auth/email-tokens";

export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  // Only checked here; the token is used up when the form is submitted.
  const live = typeof token === "string" && (await peekEmailToken(token, "RESET_PASSWORD"));

  return (
    <>
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-tight font-bold">Choose a new password</h1>
      </div>
      {live ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert>
          <LinkIcon aria-hidden />
          <AlertTitle>This link doesn&apos;t work anymore</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {INVALID_RESET_LINK}
            <ButtonLink href="/forgot-password" size="lg">
              Send a new link
            </ButtonLink>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
