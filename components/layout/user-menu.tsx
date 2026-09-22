"use client";

import Link from "next/link";
import { LayoutDashboardIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts.length > 1 ? parts.at(-1)![0] : "").toUpperCase();
}

export function UserMenu({ name, email }: { name: string; email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Account menu" />}
      >
        <Avatar>
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate font-medium text-foreground">{name}</span>
            <span className="block truncate text-xs font-normal">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard" />}>
          <LayoutDashboardIcon aria-hidden />
          My polls
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <SettingsIcon aria-hidden />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logoutAction()}>
          <LogOutIcon aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
