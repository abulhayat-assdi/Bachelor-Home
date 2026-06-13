"use client";

import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/types/database";

async function fetchNotifications(): Promise<AppNotification[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data as AppNotification[]) ?? [];
}

export function useNotifications() {
  const { data, isLoading, mutate } = useSWR("notifications", fetchNotifications);
  const notifications = data ?? [];

  // Realtime: one deduped revalidation when a new notification lands.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-live-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => mutate()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  const markRead = useCallback(
    async (id: string) => {
      const supabase = createClient();
      await mutate(
        async (current) => {
          await supabase.from("notifications").update({ is_read: true }).eq("id", id);
          return current?.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        },
        {
          optimisticData: (current) =>
            current?.map((n) => (n.id === id ? { ...n, is_read: true } : n)) ?? [],
          revalidate: false,
          rollbackOnError: true,
        }
      );
    },
    [mutate]
  );

  const markAllRead = useCallback(async () => {
    const supabase = createClient();
    await mutate(
      async (current) => {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("is_read", false);
        return current?.map((n) => ({ ...n, is_read: true }));
      },
      {
        optimisticData: (current) =>
          current?.map((n) => ({ ...n, is_read: true })) ?? [],
        revalidate: false,
        rollbackOnError: true,
      }
    );
  }, [mutate]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading: isLoading,
    markRead,
    markAllRead,
    refetch: () => mutate(),
  };
}
