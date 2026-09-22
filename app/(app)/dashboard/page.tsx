import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { requirePageUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "My polls" };

// Placeholder until the poll list lands in Phase 3.
export default async function DashboardPage() {
  const user = await requirePageUser("/dashboard");
  return (
    <PageContainer className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Hi, {user.name.split(" ")[0]}</h1>
      <p className="mt-2 text-muted-foreground">Your polls will appear here.</p>
    </PageContainer>
  );
}
