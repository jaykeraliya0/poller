import { MailWarningIcon } from "lucide-react";
import { ResendVerificationButton } from "./resend-verification-button";

/** Shown across the signed-in app until the address is confirmed. */
export function VerifyEmailBanner({ email }: { email: string }) {
  return (
    <div role="status" className="border-b bg-signal-wash">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <MailWarningIcon className="size-4 shrink-0 text-signal-ink" aria-hidden />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-medium">Confirm your email.</span>{" "}
          <span className="text-muted-foreground">
            We sent a link to <span className="break-all">{email}</span>. You need it to create polls and to open private polls
            you&apos;re invited to.
          </span>
        </p>
        <ResendVerificationButton email={email} size="sm" />
      </div>
    </div>
  );
}
