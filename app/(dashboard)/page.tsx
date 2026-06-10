"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  UtensilsCrossed,
  ShoppingBasket,
  Receipt,
  TrendingUp,
  Wallet,
  Lock,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useBill } from "@/hooks/useBill";
import { MonthSwitcher } from "@/components/shared/MonthSwitcher";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { memberColor } from "@/lib/constants";
import { formatMeals, formatMoney, todayIso } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { year, month } = useAppStore();
  const { bill, meals, bazar, monthRow, me, loading } = useBill(year, month);

  const myBill = bill.members.find((m) => m.profile.id === me?.id);
  const today = todayIso();
  const myToday = meals.find(
    (m) => m.user_id === me?.id && m.entry_date === today
  );
  const myTodayTotal = myToday
    ? Number(myToday.breakfast) + Number(myToday.lunch) + Number(myToday.dinner)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher isLocked={monthRow?.is_locked} />

      {monthRow?.is_locked && (
        <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2.5 text-xs font-semibold text-accent">
          <Lock className="h-3.5 w-3.5" />
          This month is locked by admin — final bill is settled.
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div {...fadeUp} transition={{ delay: 0 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-secondary" />
                    Total Meals
                  </div>
                  <div className="mt-1.5 text-2xl font-extrabold text-secondary">
                    {formatMeals(bill.totalMeals)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted">
                    <ShoppingBasket className="h-3.5 w-3.5 text-accent" />
                    Total Bazar
                  </div>
                  <div className="mt-1.5 text-2xl font-extrabold">
                    {formatMoney(bill.totalBazar)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    Meal Rate
                  </div>
                  <div className="mt-1.5 text-2xl font-extrabold text-primary">
                    {formatMoney(bill.mealRate)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted">
                    <Wallet className="h-3.5 w-3.5 text-secondary" />
                    My Bill
                  </div>
                  <div className="mt-1.5 text-2xl font-extrabold">
                    {formatMoney(myBill?.total ?? 0)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick actions */}
          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <div className="grid grid-cols-3 gap-3">
              <Link
                href="/meal"
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-primary px-3 py-4 text-center text-xs font-bold text-white shadow-card transition-transform active:scale-95"
              >
                <UtensilsCrossed className="h-5 w-5" />
                {myTodayTotal > 0
                  ? `Today: ${formatMeals(myTodayTotal)} meals`
                  : "Add today's meal"}
              </Link>
              <Link
                href="/bazar"
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-secondary px-3 py-4 text-center text-xs font-bold text-white shadow-card transition-transform active:scale-95"
              >
                <ShoppingBasket className="h-5 w-5" />
                Add bazar
              </Link>
              <Link
                href="/bill"
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-accent px-3 py-4 text-center text-xs font-bold text-white shadow-card transition-transform active:scale-95"
              >
                <Receipt className="h-5 w-5" />
                View bill
              </Link>
            </div>
          </motion.div>

          {/* Members overview */}
          <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
            <Card>
              <CardContent className="p-2">
                <div className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">
                  Members — {bazar.length} bazar entries this month
                </div>
                <div className="flex flex-col">
                  {bill.members.map((m) => {
                    const spent = bazar
                      .filter((b) => b.shopper_id === m.profile.id)
                      .reduce((s, b) => s + Number(b.amount), 0);
                    return (
                      <div
                        key={m.profile.id}
                        className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-bg/60"
                      >
                        <Avatar
                          name={m.profile.full_name}
                          src={m.profile.avatar_url}
                          color={memberColor(m.profile.order_index)}
                          size={36}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 truncate text-sm font-semibold">
                            {m.profile.full_name}
                            {m.profile.role === "admin" && (
                              <Badge className="bg-primary/15 text-primary">
                                Admin
                              </Badge>
                            )}
                            {m.profile.id === me?.id && (
                              <Badge className="bg-secondary/15 text-secondary">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted">
                            {formatMeals(m.meals)} meals · bazar{" "}
                            {formatMoney(spent)}
                          </div>
                        </div>
                        <div className="text-sm font-bold">
                          {formatMoney(m.total)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
