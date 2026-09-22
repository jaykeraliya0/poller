"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutListIcon, SettingsIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean };

const ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "My polls",
    icon: LayoutListIcon,
    // A poll's manage and edit pages live under "My polls" too.
    match: (path) => path === "/dashboard" || (/^\/polls\/[^/]+\/(manage|edit)$/.test(path)),
  },
  { href: "/settings", label: "Settings", icon: SettingsIcon, match: (path) => path === "/settings" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/35",
              active && "bg-panel text-foreground shadow-[0_0_0_1px_var(--line),0_1px_2px_rgb(21_24_35/0.05)]",
            )}
          >
            <item.icon className={cn("size-4", active && "text-signal")} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
