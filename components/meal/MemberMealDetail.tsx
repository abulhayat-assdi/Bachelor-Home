"use client";

import { useMemo } from "react";
import type { MealEntry, Profile } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { memberColor } from "@/lib/constants";
import { formatMeals, shortDate, weekdayName } from "@/lib/utils";

/**
 * Read-only day-by-day breakdown for a single member, plus their month total
 * (counted up to today). Shown when a member is picked from the filter strip.
 */
export function MemberMealDetail({
  member,
  entries,
  today,
}: {
  member: Profile;
  entries: MealEntry[];
  today: string;
}) {
  // Only this member's days that actually have meals, newest first.
  const rows = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.user_id === member.id &&
            Number(e.breakfast) + Number(e.lunch) + Number(e.dinner) > 0
        )
        .sort((a, b) => b.entry_date.localeCompare(a.entry_date)),
    [entries, member.id]
  );

  const monthTotal = rows
    .filter((e) => e.entry_date <= today)
    .reduce(
      (s, e) => s + Number(e.breakfast) + Number(e.lunch) + Number(e.dinner),
      0
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card dark:shadow-card-dark">
        <Avatar
          name={member.full_name}
          src={member.avatar_url}
          color={memberColor(member.order_index)}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{member.full_name}</div>
          <div className="text-[11px] text-muted">
            {rows.length} day{rows.length === 1 ? "" : "s"} with meals
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-secondary">
            {formatMeals(monthTotal)}
          </div>
          <div className="text-[10px] font-semibold uppercase text-muted">
            meals this month
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-6 text-center text-xs text-muted shadow-card dark:shadow-card-dark">
          No meals recorded yet.
        </p>
      ) : (
        rows.map((e) => {
          const b = Number(e.breakfast);
          const l = Number(e.lunch);
          const d = Number(e.dinner);
          return (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2.5 shadow-card dark:shadow-card-dark"
            >
              <div className="w-14 shrink-0">
                <div className="text-sm font-extrabold">
                  {shortDate(e.entry_date)}
                </div>
                <div className="text-[10px] text-muted">
                  {weekdayName(e.entry_date).slice(0, 3)}
                </div>
              </div>
              <div className="flex flex-1 items-center gap-3 text-[11px] tabular-nums text-muted">
                <span>B {formatMeals(b)}</span>
                <span>L {formatMeals(l)}</span>
                <span>D {formatMeals(d)}</span>
              </div>
              <span className="text-base font-extrabold text-secondary tabular-nums">
                {formatMeals(b + l + d)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
