import { SiteShell } from "@/components/layout/site-shell";

/** Poll links are public, but keep the signed-in shell for whoever already has a session. */
export default function PollLayout({ children }: LayoutProps<"/">) {
  return <SiteShell>{children}</SiteShell>;
}
