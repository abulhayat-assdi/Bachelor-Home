"use client";

import { useAppStore } from "@/store/useAppStore";
import { useMonthData } from "@/hooks/useMonthData";
import { useProfiles } from "@/hooks/useProfiles";
import { MonthSwitcher } from "@/components/shared/MonthSwitcher";
import { BazarList } from "@/components/bazar/BazarList";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/utils";

export default function BazarPage() {
  const { year, month } = useAppStore();
  const { bazar, duty, monthRow, loading, saveBazar } = useMonthData(
    year,
    month
  );
  const { profiles, me, loading: pLoading } = useProfiles();

  const total = bazar.reduce((s, b) => s + Number(b.amount), 0);

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher isLocked={monthRow?.is_locked} />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-extrabold">Bazar Expenses</h1>
          <p className="text-xs text-muted">
            Only the assigned shopper can enter their day&apos;s amount.
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-secondary">
            {formatMoney(total)}
          </div>
          <div className="text-[10px] text-muted">month total</div>
        </div>
      </div>

      {loading || pLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <BazarList
          duty={duty}
          bazar={bazar}
          profiles={profiles}
          meId={me?.id ?? null}
          isAdmin={me?.role === "admin"}
          isLocked={monthRow?.is_locked ?? false}
          onSave={saveBazar}
        />
      )}
    </div>
  );
}
