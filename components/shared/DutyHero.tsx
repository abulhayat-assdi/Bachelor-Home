"use client";

import { ChefHat } from "lucide-react";
import type { DutyDay, Profile } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { memberColor } from "@/lib/constants";
import { shortDate, weekdayName } from "@/lib/utils";

function isNextDay(a: string, b: string): boolean {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return db.getTime() - da.getTime() === 86_400_000;
}

/** The contiguous duty run (from–to) for `user` that contains `today`. */
function dutyRange(
  duty: DutyDay[],
  userId: string,
  today: string
): { from: string; to: string } | null {
  const dates = duty
    .filter((d) => d.user_id === userId)
    .map((d) => d.duty_date)
    .sort();
  if (dates.length === 0) return null;
  let run = [dates[0]];
  for (let i = 1; i < dates.length; i++) {
    if (isNextDay(run[run.length - 1], dates[i])) run.push(dates[i]);
    else if (run.includes(today)) break;
    else run = [dates[i]];
  }
  if (!run.includes(today)) return null;
  return { from: run[0], to: run[run.length - 1] };
}

/**
 * Hero banner naming who manages food today (bazar + cooking duty), with the
 * span of their turn. Shown at the top of the home page.
 */
export function DutyHero({
  members,
  duty,
  today,
}: {
  members: Profile[];
  duty: DutyDay[];
  today: string;
}) {
  const todayDuty = duty.find((d) => d.duty_date === today);
  const person = members.find((p) => p.id === todayDuty?.user_id);
  const range = person ? dutyRange(duty, person.id, today) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary px-5 py-5 text-white shadow-card">
      <ChefHat className="absolute -right-3 -top-3 h-24 w-24 rotate-12 text-white/10" />
      <div className="relative flex items-center gap-4">
        {person ? (
          <>
            <Avatar
              name={person.full_name}
              src={person.avatar_url}
              color={memberColor(person.order_index)}
              size={56}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                <ChefHat className="h-3.5 w-3.5" />
                Food duty · {weekdayName(today)}
              </div>
              <div className="truncate text-2xl font-extrabold leading-tight">
                {person.full_name}
              </div>
              {range && (
                <div className="mt-0.5 text-xs font-medium text-white/85">
                  Duty: {shortDate(range.from)} – {shortDate(range.to)}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-white/80" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                Food duty
              </div>
              <div className="text-lg font-extrabold">
                No one assigned today
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
