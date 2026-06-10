"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Lock } from "lucide-react";
import type { MealEntry, Profile } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { MealInput } from "./MealInput";
import { memberColor } from "@/lib/constants";
import { cn, formatMeals, shortDate, weekdayName } from "@/lib/utils";

export function DayCard({
  date,
  members,
  entries,
  meId,
  isFuture,
  isLocked,
  isToday,
  onChange,
}: {
  date: string;
  members: Profile[];
  entries: MealEntry[];
  meId: string | null;
  isFuture: boolean;
  isLocked: boolean;
  isToday: boolean;
  onChange: (
    userId: string,
    date: string,
    values: { breakfast: number; lunch: number; dinner: number }
  ) => void;
}) {
  const [expanded, setExpanded] = useState(isToday);

  const entryFor = (userId: string) =>
    entries.find((e) => e.user_id === userId && e.entry_date === date);

  const dayTotal = entries
    .filter((e) => e.entry_date === date)
    .reduce(
      (s, e) => s + Number(e.breakfast) + Number(e.lunch) + Number(e.dinner),
      0
    );

  const myEntry = meId ? entryFor(meId) : undefined;
  const my = {
    breakfast: Number(myEntry?.breakfast ?? 0),
    lunch: Number(myEntry?.lunch ?? 0),
    dinner: Number(myEntry?.dinner ?? 0),
  };
  const editable = !isFuture && !isLocked && !!meId;

  if (isFuture) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-border-c px-4 py-2 opacity-50">
        <span className="text-xs font-semibold">{shortDate(date)}</span>
        <span className="flex items-center gap-1 text-[10px] text-muted">
          <Lock className="h-3 w-3" /> locked until {shortDate(date)}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl bg-surface shadow-card dark:shadow-card-dark",
        isToday && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between p-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold">
            {shortDate(date)}
            {isToday && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                TODAY
              </span>
            )}
            {isLocked && <Lock className="h-3 w-3 text-accent" />}
          </div>
          <div className="text-[11px] text-muted">{weekdayName(date)}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-secondary">
            {formatMeals(dayTotal)}
          </div>
          <div className="text-[10px] text-muted">day total</div>
        </div>
      </div>

      {/* My row — editable steppers */}
      {meId && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl bg-bg/60 p-3">
          <MealInput
            label="Breakfast"
            value={my.breakfast}
            disabled={!editable}
            onChange={(v) => onChange(meId, date, { ...my, breakfast: v })}
          />
          <MealInput
            label="Lunch"
            value={my.lunch}
            disabled={!editable}
            onChange={(v) => onChange(meId, date, { ...my, lunch: v })}
          />
          <MealInput
            label="Dinner"
            value={my.dinner}
            disabled={!editable}
            onChange={(v) => onChange(meId, date, { ...my, dinner: v })}
          />
        </div>
      )}

      {/* Other members — read-only */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-semibold text-muted"
      >
        Everyone&apos;s meals
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
        />
      </button>
      {expanded && (
        <div className="flex flex-col gap-1 px-3 pb-3">
          {members.map((p) => {
            const e = entryFor(p.id);
            const isMe = p.id === meId;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
                  isMe && "bg-primary/5"
                )}
              >
                <Avatar
                  name={p.full_name}
                  src={p.avatar_url}
                  color={memberColor(p.order_index)}
                  size={26}
                />
                <span className="flex-1 truncate text-xs font-medium">
                  {p.full_name}
                </span>
                <div className="flex items-center gap-2 text-xs tabular-nums text-muted">
                  <span>B {formatMeals(Number(e?.breakfast ?? 0))}</span>
                  <span>L {formatMeals(Number(e?.lunch ?? 0))}</span>
                  <span>D {formatMeals(Number(e?.dinner ?? 0))}</span>
                  {!isMe && <Lock className="h-3 w-3 opacity-40" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
