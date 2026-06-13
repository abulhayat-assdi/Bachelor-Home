"use client";

import { useState } from "react";
import { Loader2, Lock, LockOpen, ShieldAlert } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useMonthData } from "@/hooks/useMonthData";
import { useProfiles } from "@/hooks/useProfiles";
import { createClient } from "@/lib/supabase/client";
import { MonthSwitcher } from "@/components/shared/MonthSwitcher";
import { MemberManager } from "@/components/admin/MemberManager";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, monthLabel } from "@/lib/utils";

const TABS = ["Members", "Schedule", "Month"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const { year, month } = useAppStore();
  const { duty, monthRow, monthId, loading, refetch } = useMonthData(
    year,
    month
  );
  const { profiles, me, loading: pLoading, refetch: refetchProfiles } =
    useProfiles();
  const [tab, setTab] = useState<Tab>("Members");
  const [locking, setLocking] = useState(false);

  if (pLoading) {
    return <Skeleton className="h-64" />;
  }

  if (me?.role !== "admin") {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-accent" />
        <h1 className="text-lg font-bold">Admin only</h1>
        <p className="text-sm text-muted">
          This panel is restricted to the Super Admin.
        </p>
      </div>
    );
  }

  async function toggleLock() {
    if (!monthRow) return;
    setLocking(true);
    const supabase = createClient();
    await supabase
      .from("months")
      .update({ is_locked: !monthRow.is_locked })
      .eq("id", monthRow.id);
    setLocking(false);
    refetch();
  }

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher isLocked={monthRow?.is_locked} />
      <h1 className="text-xl font-extrabold">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-surface p-1 shadow-card dark:shadow-card-dark">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-bold transition-colors",
              tab === t ? "bg-primary text-white" : "text-muted hover:text-text"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          {tab === "Members" && (
            <MemberManager
              profiles={profiles}
              meId={me.id}
              monthId={monthId}
              onChanged={() => {
                refetchProfiles();
                refetch();
              }}
            />
          )}
          {tab === "Schedule" && (
            <ScheduleEditor
              duty={duty}
              profiles={profiles}
              monthId={monthId}
              onChanged={refetch}
            />
          )}
          {tab === "Month" && monthRow && (
            <Card>
              <CardContent className="flex flex-col gap-4 p-4">
                <div>
                  <div className="text-sm font-bold">
                    {monthLabel(year, month)} —{" "}
                    {monthRow.is_locked ? "Locked" : "Open"}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Locking the month freezes all meal &amp; bazar entries.
                    Members are notified that the final bill is ready. You can
                    unlock anytime.
                  </p>
                </div>
                <Button
                  variant={monthRow.is_locked ? "secondary" : "destructive"}
                  onClick={toggleLock}
                  disabled={locking}
                >
                  {locking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : monthRow.is_locked ? (
                    <LockOpen className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {monthRow.is_locked
                    ? "Unlock this month"
                    : "Lock this month (after settlement)"}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
