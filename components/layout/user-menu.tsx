"use client";

import Link from "next/link";
import { ChevronsUpDownIcon, InboxIcon, LayoutListIcon, LogOutIcon, SettingsIcon, UsersIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts.length > 1 ? parts.at(-1)![0] : "").toUpperCase();
}

function Monogram({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[0.7rem] font-semibold text-background",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

type UserMenuProps = {
  name: string;
  email: string;
  /** "row" shows name and email, for the bottom of the sidebar. */
  variant?: "avatar" | "row";
};

export function UserMenu({ name, email, variant = "avatar" }: UserMenuProps) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      {variant === "row" ? (
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2.5 px-2 py-2 text-left hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent"
              aria-label="Account menu"
            />
          }
        >
          <Monogram name={name} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-lg" className="size-11 rounded-full" aria-label="Account menu" />}
        >
          <Monogram name={name} />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align={variant === "row" ? "start" : "end"} side={variant === "row" ? "top" : "bottom"} className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate font-medium text-foreground">{name}</span>
            <span className="block truncate text-xs font-normal">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard" />}>
          <LayoutListIcon aria-hidden />
          My polls
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/shared" />}>
          <InboxIcon aria-hidden />
          Shared with me
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/groups" />}>
          <UsersIcon aria-hidden />
          Groups
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <SettingsIcon aria-hidden />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(value) => setTheme(value as string)}>
            <DropdownMenuRadioItem value="system">Match system</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logoutAction()}>
          <LogOutIcon aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
