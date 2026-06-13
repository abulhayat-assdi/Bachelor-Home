"use client";

import { useState } from "react";
import { Pencil, Users } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useMonthData } from "@/hooks/useMonthData";
import { useProfiles } from "@/hooks/useProfiles";
import { MonthSwitcher } from "@/components/shared/MonthSwitcher";
import { MealGrid } from "@/components/meal/MealGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Mode = "mine" | "everyone";

export default function MealPage() {
  const { year, month } = useAppStore();
  const { meals, monthRow, loading, upsertMeal } = useMonthData(year, month);
  const { activeProfiles, me, loading: pLoading } = useProfiles();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("mine");

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
          {mode === "mine"
            ? "Set your meals for today or any day ahead. Past days lock automatically."
            : "See who gave how many meals each day. Read-only."}
        </p>
      </div>

      {/* Mode switch */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-1 shadow-card dark:shadow-card-dark">
        <button
          onClick={() => setMode("mine")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-colors",
            mode === "mine"
              ? "bg-primary text-white"
              : "text-muted hover:text-text"
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit my meals
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
          View everyone&apos;s meals
        </button>
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
          isAdmin={me?.role === "admin"}
          mode={mode}
          onChange={handleChange}
        />
      )}
    </div>
  );
}
