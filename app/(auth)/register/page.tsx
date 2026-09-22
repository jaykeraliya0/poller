import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  return (
    <>
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          You need an account to create polls. Voting doesn&apos;t require one.
        </p>
      </div>
      <AuthForm mode="register" next={safeRedirectPath(next)} />
    </>
  );
}
