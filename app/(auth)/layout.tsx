import { PageContainer } from "@/components/layout/page-container";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <PageContainer className="flex flex-1 items-start justify-center py-10 sm:items-center">
      <div className="w-full max-w-sm">{children}</div>
    </PageContainer>
  );
}
