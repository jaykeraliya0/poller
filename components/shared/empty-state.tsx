import type { LucideIcon } from "lucide-react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
  /** Heading level of the title; use 1 when the empty state is the whole page. */
  level?: 1 | 2 | 3;
};

export function EmptyState({ icon: Icon, title, description, children, level = 2 }: EmptyStateProps) {
  return (
    <Empty className="border bg-panel">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-11 rounded-[12px] bg-signal-wash text-signal [&_svg:not([class*='size-'])]:size-5">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={level}>
          {title}
        </EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent className="max-w-md">{children}</EmptyContent>}
    </Empty>
  );
}
