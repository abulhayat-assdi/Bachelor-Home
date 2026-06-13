"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

interface ProfilesData {
  profiles: Profile[];
  meId: string | null;
}

async function fetchProfiles(): Promise<ProfilesData> {
  const supabase = createClient();
  // getSession() reads the locally cached session (no auth-server round trip).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("order_index", { ascending: true });
  return {
    profiles: (data ?? []) as Profile[],
    meId: session?.user?.id ?? null,
  };
}

/**
 * Shared profiles cache. TopBar, BottomNav and every page call this with the
 * same SWR key, so it resolves to a single deduped request instead of one
 * fetch per consumer.
 */
export function useProfiles() {
  const { data, isLoading, mutate } = useSWR("profiles", fetchProfiles);

  const profiles = data?.profiles ?? [];
  const meId = data?.meId ?? null;
  const me = useMemo(
    () => profiles.find((p) => p.id === meId) ?? null,
    [profiles, meId]
  );
  const activeProfiles = useMemo(
    () => profiles.filter((p) => p.is_active),
    [profiles]
  );

  return {
    profiles,
    activeProfiles,
    me,
    loading: isLoading,
    refetch: () => mutate(),
  };
}
