"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [me, setMe] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("order_index", { ascending: true });
    const all = (data ?? []) as Profile[];
    setProfiles(all);
    setMe(all.find((p) => p.id === user?.id) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profiles, activeProfiles: profiles.filter((p) => p.is_active), me, loading, refetch };
}
