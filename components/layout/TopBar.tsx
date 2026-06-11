"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Avatar } from "@/components/ui/avatar";
import { memberColor } from "@/lib/constants";
import { useProfiles } from "@/hooks/useProfiles";

export function TopBar() {
  const { me } = useProfiles();

  return (
    <header className="sticky top-0 z-40 border-b border-border-c bg-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size="sm" />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">
              Bachelor Home
            </div>
            <div className="text-[10px] text-muted">ব্যাচেলর হোম</div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
          {me && (
            <Link href="/profile" aria-label="My profile" className="ml-1">
              <Avatar
                name={me.full_name}
                src={me.avatar_url}
                color={memberColor(me.order_index)}
                size={32}
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
