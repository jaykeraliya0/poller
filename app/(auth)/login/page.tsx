import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { QueryToast } from "@/components/shared/query-toast";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  // Already signed in: skip the form. Checked here (not in the proxy) so a stale cookie can't loop.
  if (await getCurrentUser()) redirect(safeRedirectPath(next));
  return (
    <>
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-tight font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Sign in to create polls and see their results.</p>
      </div>
      <AuthForm mode="login" next={safeRedirectPath(next)} />
      <QueryToast param="reset" value="1" message="Password changed. Sign in with your new one." />
      <QueryToast param="verified" value="1" message="Email confirmed. Sign in to continue." />
    </>
  );
}
