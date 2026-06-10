"use client";

import { useMemo } from "react";
import type { MealEntry, Profile } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { DayCard } from "./DayCard";
import { memberColor } from "@/lib/constants";
import { daysInMonth, formatMeals, isoDate, todayIso } from "@/lib/utils";

export function MealGrid({
  year,
  month,
  members,
  entries,
  meId,
  isLocked,
  onChange,
}: {
  year: number;
  month: number;
  members: Profile[];
  entries: MealEntry[];
  meId: string | null;
  isLocked: boolean;
  onChange: (
    userId: string,
    date: string,
    values: { breakfast: number; lunch: number; dinner: number }
  ) => void;
}) {
  const today = todayIso();
  const days = daysInMonth(year, month);

  // newest day first; future days collapse into thin locked rows
  const dates = useMemo(
    () =>
      Array.from({ length: days }, (_, i) => isoDate(year, month, days - i)),
    [year, month, days]
  );

  const totals = useMemo(
    () =>
      members.map((p) => ({
        profile: p,
        total: entries
          .filter((e) => e.user_id === p.id)
          .reduce(
            (s, e) =>
              s + Number(e.breakfast) + Number(e.lunch) + Number(e.dinner),
            0
          ),
      })),
    [members, entries]
  );

  const grandTotal = totals.reduce((s, t) => s + t.total, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Monthly totals strip (auto-calculated, read-only) */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <div className="flex shrink-0 flex-col items-center gap-1 rounded-xl bg-primary px-3 py-2 text-white shadow-card">
          <span className="text-[10px] font-semibold uppercase">Grand</span>
          <span className="text-base font-extrabold">
            {formatMeals(grandTotal)}
          </span>
        </div>
        {totals.map((t) => (
          <div
            key={t.profile.id}
            className="flex shrink-0 flex-col items-center gap-1 rounded-xl bg-surface px-3 py-2 shadow-card dark:shadow-card-dark"
          >
            <div className="flex items-center gap-1.5">
              <Avatar
                name={t.profile.full_name}
                src={t.profile.avatar_url}
                color={memberColor(t.profile.order_index)}
                size={18}
              />
              <span className="max-w-20 truncate text-[10px] font-semibold">
                {t.profile.full_name.split(" ")[0]}
              </span>
            </div>
            <span className="text-base font-extrabold text-secondary">
              {formatMeals(t.total)}
            </span>
          </div>
        ))}
      </div>

      {dates.map((d) => (
        <DayCard
          key={d}
          date={d}
          members={members}
          entries={entries}
          meId={meId}
          isFuture={d > today}
          isLocked={isLocked}
          isToday={d === today}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
