"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Pencil, Plus } from "lucide-react";
import type { BazarExpense, DutyDay, Profile } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { ItemComment } from "./ItemComment";
import { BazarEntryModal } from "./BazarEntryModal";
import { memberColor } from "@/lib/constants";
import { cn, formatMoney, shortDate, todayIso, weekdayName } from "@/lib/utils";

interface DutyBlockView {
  profile: Profile | undefined;
  from: string;
  to: string;
  days: number;
}

export function BazarList({
  duty,
  bazar,
  profiles,
  meId,
  isAdmin,
  isLocked,
  onSave,
}: {
  duty: DutyDay[];
  bazar: BazarExpense[];
  profiles: Profile[];
  meId: string | null;
  isAdmin: boolean;
  isLocked: boolean;
  onSave: (
    shopperId: string,
    date: string,
    amount: number,
    comment: string | null,
    existingId?: string
  ) => Promise<string | null>;
}) {
  const today = todayIso();
  const [editing, setEditing] = useState<{
    date: string;
    shopperId: string;
    existing?: BazarExpense;
  } | null>(null);

  const profileOf = (id: string) => profiles.find((p) => p.id === id);

  // Group consecutive duty days into blocks for the schedule strip
  const blocks = useMemo<DutyBlockView[]>(() => {
    const sorted = [...duty].sort((a, b) =>
      a.duty_date.localeCompare(b.duty_date)
    );
    const out: DutyBlockView[] = [];
    for (const d of sorted) {
      const last = out[out.length - 1];
      if (last && last.profile?.id === d.user_id) {
        last.to = d.duty_date;
        last.days += 1;
      } else {
        out.push({
          profile: profileOf(d.user_id),
          from: d.duty_date,
          to: d.duty_date,
          days: 1,
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duty, profiles]);

  const sortedDuty = useMemo(
    () =>
      [...duty].sort((a, b) => b.duty_date.localeCompare(a.duty_date)),
    [duty]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Duty schedule strip */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-surface px-3 py-2 shadow-card dark:shadow-card-dark"
          >
            <Avatar
              name={b.profile?.full_name ?? "?"}
              src={b.profile?.avatar_url}
              color={memberColor(b.profile?.order_index)}
              size={26}
            />
            <div className="leading-tight">
              <div className="text-[11px] font-bold">
                {b.profile?.full_name.split(" ")[0]}
              </div>
              <div className="text-[10px] text-muted">
                {shortDate(b.from)} – {shortDate(b.to)} · {b.days}d
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Day-by-day list */}
      <div className="flex flex-col gap-2">
        {sortedDuty.map((d, idx) => {
          const shopper = profileOf(d.user_id);
          const expense = bazar.find((b) => b.expense_date === d.duty_date);
          const isFuture = d.duty_date > today;
          const canEdit =
            !isLocked &&
            !isFuture &&
            (isAdmin || (meId !== null && d.user_id === meId));
          const isToday = d.duty_date === today;

          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.015, 0.3) }}
              className={cn(
                "flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card dark:shadow-card-dark",
                isFuture && "opacity-50",
                isToday && "ring-2 ring-secondary"
              )}
            >
              <div className="w-14 shrink-0">
                <div className="text-sm font-extrabold">
                  {shortDate(d.duty_date)}
                </div>
                <div className="text-[10px] text-muted">
                  {weekdayName(d.duty_date).slice(0, 3)}
                </div>
              </div>
              <Avatar
                name={shopper?.full_name ?? "?"}
                src={shopper?.avatar_url}
                color={memberColor(shopper?.order_index)}
                size={30}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">
                  {shopper?.full_name ?? "Unassigned"}
                  {d.user_id === meId && (
                    <span className="ml-1 text-[10px] font-bold text-secondary">
                      (you)
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "text-sm font-extrabold",
                    expense ? "text-text" : "text-muted"
                  )}
                >
                  {expense ? formatMoney(Number(expense.amount)) : "—"}
                </div>
              </div>
              {expense?.comment && <ItemComment comment={expense.comment} />}
              {canEdit ? (
                <button
                  aria-label={expense ? "Edit expense" : "Add expense"}
                  onClick={() =>
                    setEditing({
                      date: d.duty_date,
                      shopperId: expense?.shopper_id ?? d.user_id,
                      existing: expense,
                    })
                  }
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm transition-transform active:scale-90",
                    expense ? "bg-primary" : "bg-secondary"
                  )}
                >
                  {expense ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <Lock className="h-4 w-4 shrink-0 text-muted opacity-40" />
              )}
            </motion.div>
          );
        })}
      </div>

      {editing && (
        <BazarEntryModal
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          date={editing.date}
          shopperName={profileOf(editing.shopperId)?.full_name ?? ""}
          initialAmount={
            editing.existing ? Number(editing.existing.amount) : undefined
          }
          initialComment={editing.existing?.comment}
          onSave={(amount, comment) =>
            onSave(
              editing.shopperId,
              editing.date,
              amount,
              comment,
              editing.existing?.id
            )
          }
        />
      )}
    </div>
  );
}
