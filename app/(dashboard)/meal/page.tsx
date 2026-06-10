"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useMonthData } from "@/hooks/useMonthData";
import { useProfiles } from "@/hooks/useProfiles";
import { MonthSwitcher } from "@/components/shared/MonthSwitcher";
import { MealGrid } from "@/components/meal/MealGrid";
import { Skeleton } from "@/components/ui/skeleton";

export default function MealPage() {
  const { year, month } = useAppStore();
  const { meals, monthRow, loading, upsertMeal } = useMonthData(year, month);
  const { activeProfiles, me, loading: pLoading } = useProfiles();
  const [error, setError] = useState<string | null>(null);

  async function handleChange(
    userId: string,
    date: string,
    values: { breakfast: number; lunch: number; dinner: number }
  ) {
    setError(null);
    const err = await upsertMeal(userId, date, values);
    if (err) setError(err);
  }

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher isLocked={monthRow?.is_locked} />
      <div>
        <h1 className="text-xl font-extrabold">Meal Tracker</h1>
        <p className="text-xs text-muted">
          Tap +/- on your own breakfast, lunch &amp; dinner. Others&apos; cells are
          read-only.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-accent/10 px-4 py-2.5 text-xs font-semibold text-accent">
          {error}
        </p>
      )}

      {loading || pLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <MealGrid
          year={year}
          month={month}
          members={activeProfiles}
          entries={meals}
          meId={me?.id ?? null}
          isLocked={monthRow?.is_locked ?? false}
          onChange={handleChange}
        />
      )}
    </div>
  );
}
