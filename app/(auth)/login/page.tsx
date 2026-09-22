import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <>
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to create polls and see their insights.</p>
      </div>
      <AuthForm mode="login" next={safeRedirectPath(next)} />
    </>
  );
}
