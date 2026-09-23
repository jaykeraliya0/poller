import { AppShell } from "@/components/layout/app-shell";

/** Pages still guard themselves (requirePageUser) so the redirect keeps `next`. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
