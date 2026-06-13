"use client";

import { useState } from "react";
import { Pencil, Users } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useMonthData } from "@/hooks/useMonthData";
import { useProfiles } from "@/hooks/useProfiles";
import { MonthSwitcher } from "@/components/shared/MonthSwitcher";
import { BazarList } from "@/components/bazar/BazarList";
import { CommonExpenses } from "@/components/bazar/CommonExpenses";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatMoney } from "@/lib/utils";

type Mode = "mine" | "everyone";

export default function BazarPage() {
  const { year, month } = useAppStore();
  const {
    bazar,
    duty,
    others,
    monthRow,
    loading,
    saveBazar,
    addCommonExpense,
    deleteCommonExpense,
  } = useMonthData(year, month);
  const { profiles, me, loading: pLoading } = useProfiles();
  const [mode, setMode] = useState<Mode>("mine");

  const isLocked = monthRow?.is_locked ?? false;
  const commonItems = others.filter((e) => e.category === "common");

  // Total shown depends on the view: my spend vs the whole house.
  const myBazar = bazar
    .filter((b) => b.shopper_id === me?.id)
    .reduce((s, b) => s + Number(b.amount), 0);
  const myCommon = commonItems
    .filter((e) => e.added_by === me?.id)
    .reduce((s, e) => s + Number(e.amount), 0);
  const allBazar = bazar.reduce((s, b) => s + Number(b.amount), 0);
  const allCommon = commonItems.reduce((s, e) => s + Number(e.amount), 0);
  const total = mode === "mine" ? myBazar + myCommon : allBazar + allCommon;

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher isLocked={monthRow?.is_locked} />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-extrabold">Expenses</h1>
          <p className="text-xs text-muted">
            {mode === "mine"
              ? "Add bazar for your duty days + any shared purchases."
              : "Everyone's bazar & common expenses. Read-only."}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-secondary">
            {formatMoney(total)}
          </div>
          <div className="text-[10px] text-muted">
            {mode === "mine" ? "my spend" : "house total"}
          </div>
        </div>
      </div>

      {/* Mode switch */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-1 shadow-card dark:shadow-card-dark">
        <button
          onClick={() => setMode("mine")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-colors",
            mode === "mine" ? "bg-primary text-white" : "text-muted hover:text-text"
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
          My expenses
        </button>
        <button
          onClick={() => setMode("everyone")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-colors",
            mode === "everyone"
              ? "bg-primary text-white"
              : "text-muted hover:text-text"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Everyone&apos;s expenses
        </button>
      </div>

      {loading || pLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <>
          <BazarList
            duty={duty}
            bazar={bazar}
            profiles={profiles}
            meId={me?.id ?? null}
            isAdmin={me?.role === "admin"}
            isLocked={isLocked}
            scope={mode}
            onSave={saveBazar}
          />
          <CommonExpenses
            items={commonItems}
            profiles={profiles}
            meId={me?.id ?? null}
            scope={mode}
            isLocked={isLocked}
            onSave={addCommonExpense}
            onDelete={deleteCommonExpense}
          />
        </>
      )}
    </div>
  );
}
