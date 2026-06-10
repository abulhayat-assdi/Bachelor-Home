"use client";

import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { monthLabel } from "@/lib/utils";

export function MonthSwitcher({ isLocked }: { isLocked?: boolean }) {
  const { year, month, nextMonth, prevMonth } = useAppStore();
  const now = new Date();
  const isFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1);

  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface px-2 py-1.5 shadow-card dark:shadow-card-dark">
      <button
        onClick={prevMonth}
        aria-label="Previous month"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-bg hover:text-text"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2 text-sm font-bold">
        {monthLabel(year, month)}
        {isLocked && <Lock className="h-3.5 w-3.5 text-accent" />}
      </div>
      <button
        onClick={nextMonth}
        disabled={isFuture}
        aria-label="Next month"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-bg hover:text-text disabled:opacity-30"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
