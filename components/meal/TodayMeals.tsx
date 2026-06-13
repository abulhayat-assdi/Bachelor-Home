"use client";

import { UtensilsCrossed, ShoppingBasket } from "lucide-react";
import type { DutyDay, MealEntry, Profile } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { memberColor } from "@/lib/constants";
import { formatMeals, shortDate } from "@/lib/utils";

/**
 * Read-only snapshot of how many meals must be cooked today, broken down per
 * member, plus who is on bazar duty. Nobody can edit here — members update
 * their own counts from the Meal page.
 */
export function TodayMeals({
  members,
  meals,
  duty,
  today,
}: {
  members: Profile[];
  meals: MealEntry[];
  duty: DutyDay[];
  today: string;
}) {
  const rows = members.map((p) => {
    const e = meals.find((m) => m.user_id === p.id && m.entry_date === today);
    const b = Number(e?.breakfast ?? 0);
    const l = Number(e?.lunch ?? 0);
    const d = Number(e?.dinner ?? 0);
    return { profile: p, b, l, d, total: b + l + d };
  });

  const grand = rows.reduce((s, r) => s + r.total, 0);
  const sumB = rows.reduce((s, r) => s + r.b, 0);
  const sumL = rows.reduce((s, r) => s + r.l, 0);
  const sumD = rows.reduce((s, r) => s + r.d, 0);

  const dutyUserId = duty.find((d) => d.duty_date === today)?.user_id;
  const dutyPerson = members.find((p) => p.id === dutyUserId);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
              <UtensilsCrossed className="h-3.5 w-3.5 text-secondary" />
              Today&apos;s Meals · {shortDate(today)}
            </div>
            <div className="mt-1 text-3xl font-extrabold text-secondary">
              {formatMeals(grand)}
              <span className="ml-1.5 text-xs font-semibold text-muted">
                to cook
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              B {formatMeals(sumB)} · L {formatMeals(sumL)} · D{" "}
              {formatMeals(sumD)}
            </div>
          </div>
          {dutyPerson && (
            <div className="flex items-center gap-2 rounded-xl bg-bg/60 px-2.5 py-1.5">
              <ShoppingBasket className="h-3.5 w-3.5 text-accent" />
              <div className="leading-tight">
                <div className="text-[9px] font-semibold uppercase text-muted">
                  Bazar duty
                </div>
                <div className="text-xs font-bold">
                  {dutyPerson.full_name.split(" ")[0]}
                </div>
              </div>
              <Avatar
                name={dutyPerson.full_name}
                src={dutyPerson.avatar_url}
                color={memberColor(dutyPerson.order_index)}
                size={26}
              />
            </div>
          )}
        </div>

        {/* Per-member breakdown — read only */}
        <div className="mt-3 flex flex-col gap-1">
          {rows.map((r) => (
            <div
              key={r.profile.id}
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5"
            >
              <Avatar
                name={r.profile.full_name}
                src={r.profile.avatar_url}
                color={memberColor(r.profile.order_index)}
                size={26}
              />
              <span className="flex-1 truncate text-xs font-medium">
                {r.profile.full_name}
              </span>
              <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted">
                <span>B {formatMeals(r.b)}</span>
                <span>L {formatMeals(r.l)}</span>
                <span>D {formatMeals(r.d)}</span>
              </div>
              <span className="w-7 text-right text-sm font-extrabold text-secondary tabular-nums">
                {formatMeals(r.total)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
