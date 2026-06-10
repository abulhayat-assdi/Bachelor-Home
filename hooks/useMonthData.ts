"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  BazarExpense,
  DutyDay,
  MealEntry,
  Month,
  OtherExpense,
} from "@/types/database";

export interface MonthData {
  monthRow: Month | null;
  monthId: string | null;
  meals: MealEntry[];
  bazar: BazarExpense[];
  duty: DutyDay[];
  others: OtherExpense[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  upsertMeal: (
    userId: string,
    entryDate: string,
    values: { breakfast: number; lunch: number; dinner: number }
  ) => Promise<string | null>;
  saveBazar: (
    shopperId: string,
    expenseDate: string,
    amount: number,
    comment: string | null,
    existingId?: string
  ) => Promise<string | null>;
}

/** Central data hook for one month: meals + bazar + duty + other expenses, with realtime refresh. */
export function useMonthData(year: number, month: number): MonthData {
  const [monthRow, setMonthRow] = useState<Month | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [bazar, setBazar] = useState<BazarExpense[]>([]);
  const [duty, setDuty] = useState<DutyDay[]>([]);
  const [others, setOthers] = useState<OtherExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const monthIdRef = useRef<string | null>(null);

  const loadAll = useCallback(async () => {
    const supabase = createClient();
    setError(null);
    try {
      // get-or-create the month row (also generates the duty schedule)
      const { data: mid, error: rpcErr } = await supabase.rpc("ensure_month", {
        p_year: year,
        p_month: month,
      });
      if (rpcErr) throw rpcErr;
      const monthId = mid as string;
      monthIdRef.current = monthId;

      const [mRow, mMeals, mBazar, mDuty, mOthers] = await Promise.all([
        supabase.from("months").select("*").eq("id", monthId).single(),
        supabase.from("meal_entries").select("*").eq("month_id", monthId),
        supabase
          .from("bazar_expenses")
          .select("*")
          .eq("month_id", monthId)
          .order("expense_date"),
        supabase
          .from("bazar_duty_schedule")
          .select("*")
          .eq("month_id", monthId)
          .order("duty_date"),
        supabase
          .from("other_expenses")
          .select("*")
          .eq("month_id", monthId)
          .order("created_at"),
      ]);
      setMonthRow((mRow.data as Month) ?? null);
      setMeals((mMeals.data as MealEntry[]) ?? []);
      setBazar((mBazar.data as BazarExpense[]) ?? []);
      setDuty((mDuty.data as DutyDay[]) ?? []);
      setOthers((mOthers.data as OtherExpense[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    loadAll();
  }, [loadAll]);

  // Realtime: refresh when anyone changes meals / bazar for this month
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`month-${year}-${month}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meal_entries" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bazar_expenses" },
        () => loadAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [year, month, loadAll]);

  const upsertMeal = useCallback(
    async (
      userId: string,
      entryDate: string,
      values: { breakfast: number; lunch: number; dinner: number }
    ) => {
      const supabase = createClient();
      const monthId = monthIdRef.current;
      if (!monthId) return "Month not loaded";
      // optimistic update
      setMeals((prev) => {
        const i = prev.findIndex(
          (m) => m.user_id === userId && m.entry_date === entryDate
        );
        if (i >= 0) {
          const next = [...prev];
          next[i] = {
            ...next[i],
            ...values,
            total_meals: values.breakfast + values.lunch + values.dinner,
          };
          return next;
        }
        return [
          ...prev,
          {
            id: `tmp-${userId}-${entryDate}`,
            month_id: monthId,
            user_id: userId,
            entry_date: entryDate,
            ...values,
            total_meals: values.breakfast + values.lunch + values.dinner,
            updated_at: new Date().toISOString(),
          },
        ];
      });
      const { error: err } = await supabase.from("meal_entries").upsert(
        {
          month_id: monthId,
          user_id: userId,
          entry_date: entryDate,
          ...values,
        },
        { onConflict: "month_id,user_id,entry_date" }
      );
      if (err) {
        await loadAll(); // roll back optimistic state
        return err.message;
      }
      return null;
    },
    [loadAll]
  );

  const saveBazar = useCallback(
    async (
      shopperId: string,
      expenseDate: string,
      amount: number,
      comment: string | null,
      existingId?: string
    ) => {
      const supabase = createClient();
      const monthId = monthIdRef.current;
      if (!monthId) return "Month not loaded";
      if (existingId) {
        const { error: err } = await supabase
          .from("bazar_expenses")
          .update({ amount, comment })
          .eq("id", existingId);
        if (err) return err.message;
      } else {
        const { error: err } = await supabase.from("bazar_expenses").insert({
          month_id: monthId,
          shopper_id: shopperId,
          expense_date: expenseDate,
          amount,
          comment,
        });
        if (err) return err.message;
      }
      await loadAll();
      return null;
    },
    [loadAll]
  );

  return {
    monthRow,
    monthId: monthIdRef.current,
    meals,
    bazar,
    duty,
    others,
    loading,
    error,
    refetch: loadAll,
    upsertMeal,
    saveBazar,
  };
}
