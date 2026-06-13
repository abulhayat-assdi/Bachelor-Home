"use client";

import { motion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Lock,
  Receipt,
  Shield,
  ShoppingBasket,
  UserPlus,
  UtensilsCrossed,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationType } from "@/types/database";

const ICONS: Record<NotificationType, React.ElementType> = {
  bazar_added: ShoppingBasket,
  bazar_updated: ShoppingBasket,
  meal_updated: UtensilsCrossed,
  member_joined: UserPlus,
  bill_ready: Receipt,
  month_locked: Lock,
  role_changed: Shield,
};

const COLORS: Record<NotificationType, string> = {
  bazar_added: "bg-secondary/15 text-secondary",
  bazar_updated: "bg-secondary/15 text-secondary",
  meal_updated: "bg-primary/15 text-primary",
  member_joined: "bg-primary/15 text-primary",
  bill_ready: "bg-accent/15 text-accent",
  month_locked: "bg-accent/15 text-accent",
  role_changed: "bg-primary/15 text-primary",
};

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markAllRead } =
    useNotifications();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Notifications</h1>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted">
          <Bell className="h-10 w-10 opacity-40" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n, i) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => !n.is_read && markRead(n.id)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl px-4 py-3 text-left shadow-card transition-colors dark:shadow-card-dark",
                  n.is_read ? "bg-surface/60 opacity-70" : "bg-surface"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    COLORS[n.type] ?? "bg-primary/15 text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug">
                    {n.message}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted">
                    {timeAgo(n.created_at)}
                  </span>
                </span>
                {!n.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
