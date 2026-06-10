"use client";

import { motion } from "framer-motion";
import type { MonthlyBill } from "@/lib/calculations/billCalculator";
import type { OtherExpense } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, memberColor } from "@/lib/constants";
import { formatMeals, formatMoney } from "@/lib/utils";

export function BillSummary({
  bill,
  others,
  meId,
}: {
  bill: MonthlyBill;
  others: OtherExpense[];
  meId: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Rate strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-semibold uppercase text-muted">
              Total Bazar
            </div>
            <div className="mt-0.5 text-base font-extrabold">
              {formatMoney(bill.totalBazar)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-semibold uppercase text-muted">
              Total Meals
            </div>
            <div className="mt-0.5 text-base font-extrabold text-secondary">
              {formatMeals(bill.totalMeals)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-semibold uppercase text-muted">
              Meal Rate
            </div>
            <div className="mt-0.5 text-base font-extrabold text-primary">
              {formatMoney(bill.mealRate)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-member breakdown */}
      <div className="flex flex-col gap-3">
        {bill.members.map((m, i) => (
          <motion.div
            key={m.profile.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card
              className={
                m.profile.id === meId ? "ring-2 ring-primary" : undefined
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={m.profile.full_name}
                    src={m.profile.avatar_url}
                    color={memberColor(m.profile.order_index)}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      {m.profile.full_name}
                      {m.profile.id === meId && (
                        <Badge className="bg-primary/15 text-primary">You</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {formatMeals(m.meals)} meals this month
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold">
                      {formatMoney(m.total)}
                    </div>
                    <div className="text-[10px] font-semibold uppercase text-muted">
                      total due
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-bg/60 p-2.5 text-center">
                  <div>
                    <div className="text-[10px] text-muted">Meal cost</div>
                    <div className="text-xs font-bold">
                      {formatMoney(m.mealCost)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted">Fixed share</div>
                    <div className="text-xs font-bold">
                      {formatMoney(m.fixedShare)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted">Custom share</div>
                    <div className="text-xs font-bold">
                      {formatMoney(m.customShare)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Other expenses */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            Other Expenses
          </div>
          {others.length === 0 ? (
            <p className="text-xs text-muted">
              No rent/utility/custom expenses added yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {others.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-semibold">
                      {e.category === "custom"
                        ? e.label ?? "Custom"
                        : CATEGORY_LABELS[e.category]}
                    </span>
                    <span className="ml-2 text-[10px] text-muted">
                      {e.split_method === "equal"
                        ? "equal per head"
                        : "meal-based"}
                    </span>
                  </div>
                  <span className="font-bold">
                    {formatMoney(Number(e.amount))}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between border-t border-border-c pt-2 text-sm font-extrabold">
                <span>Grand total (all members)</span>
                <span>{formatMoney(bill.grandTotal)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
