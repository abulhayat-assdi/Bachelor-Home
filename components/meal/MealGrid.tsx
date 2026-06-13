"use client";

import { useMemo, useState } from "react";
import type { MealEntry, Profile } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { DayCard } from "./DayCard";
import { MemberMealDetail } from "./MemberMealDetail";
import { memberColor } from "@/lib/constants";
import { cn, daysInMonth, formatMeals, isoDate, todayIso } from "@/lib/utils";

export function MealGrid({
  year,
  month,
  members,
  entries,
  meId,
  isLocked,
  isAdmin,
  mode,
  onChange,
}: {
  year: number;
  month: number;
  members: Profile[];
  entries: MealEntry[];
  meId: string | null;
  isLocked: boolean;
  isAdmin: boolean;
  /** "mine" = edit my meals; "everyone" = read-only house view. */
  mode: "mine" | "everyone";
  onChange: (
    userId: string,
    date: string,
    values: { breakfast: number; lunch: number; dinner: number }
  ) => void;
}) {
  const today = todayIso();
  const days = daysInMonth(year, month);

  // null = day-by-day; otherwise spotlight one member (read-only)
  const [filterId, setFilterId] = useState<string | null>(null);
  const filtered = members.find((p) => p.id === filterId) ?? null;

  // newest day first
  const dates = useMemo(
    () =>
      Array.from({ length: days }, (_, i) => isoDate(year, month, days - i)),
    [year, month, days]
  );

  // Meal count reflects what's actually been eaten — up to today only.
  const totals = useMemo(
    () =>
      members.map((p) => ({
        profile: p,
        total: entries
          .filter((e) => e.user_id === p.id && e.entry_date <= today)
          .reduce(
            (s, e) =>
              s + Number(e.breakfast) + Number(e.lunch) + Number(e.dinner),
            0
          ),
      })),
    [members, entries, today]
  );

  const grandTotal = totals.reduce((s, t) => s + t.total, 0);

  // ----- MY MEALS: editable day list, no member strip -----
  if (mode === "mine") {
    const myTotal = totals.find((t) => t.profile.id === meId)?.total ?? 0;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl bg-primary px-4 py-2.5 text-white shadow-card">
          <span className="text-xs font-bold uppercase">My meals so far</span>
          <span className="text-lg font-extrabold">{formatMeals(myTotal)}</span>
        </div>
        {dates.map((d) => (
          <DayCard
            key={d}
            date={d}
            members={members}
            entries={entries}
            meId={meId}
            isPast={d < today}
            isLocked={isLocked}
            isAdmin={isAdmin}
            isToday={d === today}
            variant="mine"
            onChange={onChange}
          />
        ))}
      </div>
    );
  }

  // ----- EVERYONE: read-only; tap a member to isolate their days -----
  return (
    <div className="flex flex-col gap-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterId(null)}
          className={cn(
            "flex shrink-0 flex-col items-center gap-1 rounded-xl bg-primary px-3 py-2 text-white shadow-card transition-transform active:scale-95",
            filterId !== null && "opacity-60"
          )}
        >
          <span className="text-[10px] font-semibold uppercase">
            {filterId === null ? "Grand" : "All"}
          </span>
          <span className="text-base font-extrabold">
            {formatMeals(grandTotal)}
          </span>
        </button>
        {totals.map((t) => (
          <button
            key={t.profile.id}
            onClick={() =>
              setFilterId((cur) => (cur === t.profile.id ? null : t.profile.id))
            }
            className={cn(
              "flex shrink-0 flex-col items-center gap-1 rounded-xl bg-surface px-3 py-2 shadow-card transition-transform active:scale-95 dark:shadow-card-dark",
              filterId === t.profile.id && "ring-2 ring-secondary",
              filterId !== null && filterId !== t.profile.id && "opacity-60"
            )}
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
          </button>
        ))}
      </div>

      {filtered ? (
        <MemberMealDetail member={filtered} entries={entries} today={today} />
      ) : (
        dates.map((d) => (
          <DayCard
            key={d}
            date={d}
            members={members}
            entries={entries}
            meId={meId}
            isPast={d < today}
            isLocked={isLocked}
            isAdmin={isAdmin}
            isToday={d === today}
            variant="everyone"
            onChange={onChange}
          />
        ))
      )}
    </div>
  );
}
