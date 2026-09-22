import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-tight font-bold">Forgot your password?</h1>
        <p className="text-muted-foreground">Enter your account&apos;s email and we&apos;ll send you a link to choose a new one.</p>
      </div>
      <ForgotPasswordForm />
    </>
  );
}
