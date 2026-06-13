"use client";

import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type {
  BazarExpense,
  DutyDay,
  MealEntry,
  MemberMonth,
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
  memberMonths: MemberMonth[];
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
  /** Member logs a shared non-food purchase (counts as their deposit). */
  addCommonExpense: (
    amount: number,
    label: string,
    existingId?: string
  ) => Promise<string | null>;
  deleteCommonExpense: (id: string) => Promise<string | null>;
  /** Admin: set a member's house rent for this month. */
  setHouseRent: (userId: string, amount: number) => Promise<string | null>;
  /** Admin: mark a member paid / unpaid for this month. */
  setPaid: (userId: string, isPaid: boolean) => Promise<string | null>;
}

/** Everything we hold in the SWR cache for one month. */
interface MonthFetch {
  monthId: string;
  monthRow: Month | null;
  meals: MealEntry[];
  bazar: BazarExpense[];
  duty: DutyDay[];
  others: OtherExpense[];
  memberMonths: MemberMonth[];
}

// `ensure_month` only ever returns the same id for a given year/month once the
// row exists, so cache it and skip the extra serial RPC on every revalidation.
const monthIdCache = new Map<string, string>();

async function resolveMonthId(year: number, month: number): Promise<string> {
  const cacheKey = `${year}-${month}`;
  const cached = monthIdCache.get(cacheKey);
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("ensure_month", {
    p_year: year,
    p_month: month,
  });
  if (error) throw error;
  const id = data as string;
  monthIdCache.set(cacheKey, id);
  return id;
}

async function fetchMonth(year: number, month: number): Promise<MonthFetch> {
  const supabase = createClient();
  const monthId = await resolveMonthId(year, month);

  const [mRow, mMeals, mBazar, mDuty, mOthers, mMm] = await Promise.all([
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
    supabase.from("member_month").select("*").eq("month_id", monthId),
  ]);

  return {
    monthId,
    monthRow: (mRow.data as Month) ?? null,
    meals: (mMeals.data as MealEntry[]) ?? [],
    bazar: (mBazar.data as BazarExpense[]) ?? [],
    duty: (mDuty.data as DutyDay[]) ?? [],
    others: (mOthers.data as OtherExpense[]) ?? [],
    memberMonths: (mMm.data as MemberMonth[]) ?? [],
  };
}

/** Central data hook for one month: meals + bazar + duty + other expenses, with realtime refresh. */
export function useMonthData(year: number, month: number): MonthData {
  const { data, error, isLoading, mutate } = useSWR<MonthFetch>(
    ["month", year, month],
    () => fetchMonth(year, month)
  );

  const monthId = data?.monthId ?? null;

  // Realtime: a single deduped revalidation when anyone changes this month's data.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`month-${year}-${month}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meal_entries" },
        () => mutate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bazar_expenses" },
        () => mutate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_month" },
        () => mutate()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [year, month, mutate]);

  const upsertMeal = useCallback(
    async (
      userId: string,
      entryDate: string,
      values: { breakfast: number; lunch: number; dinner: number }
    ) => {
      if (!monthId) return "Month not loaded";
      const supabase = createClient();
      const total = values.breakfast + values.lunch + values.dinner;

      const applyMeal = (current?: MonthFetch): MonthFetch => {
        const base: MonthFetch = current ?? {
          monthId,
          monthRow: null,
          meals: [],
          bazar: [],
          duty: [],
          others: [],
          memberMonths: [],
        };
        const i = base.meals.findIndex(
          (m) => m.user_id === userId && m.entry_date === entryDate
        );
        const meals = [...base.meals];
        if (i >= 0) {
          meals[i] = { ...meals[i], ...values, total_meals: total };
        } else {
          meals.push({
            id: `tmp-${userId}-${entryDate}`,
            month_id: monthId,
            user_id: userId,
            entry_date: entryDate,
            ...values,
            total_meals: total,
            updated_at: new Date().toISOString(),
          });
        }
        return { ...base, meals };
      };

      try {
        await mutate(
          async (current) => {
            const { error: err } = await supabase.from("meal_entries").upsert(
              { month_id: monthId, user_id: userId, entry_date: entryDate, ...values },
              { onConflict: "month_id,user_id,entry_date" }
            );
            if (err) throw new Error(err.message);
            return applyMeal(current);
          },
          { optimisticData: applyMeal, revalidate: false, rollbackOnError: true }
        );
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Failed to save meal";
      }
    },
    [monthId, mutate]
  );

  const saveBazar = useCallback(
    async (
      shopperId: string,
      expenseDate: string,
      amount: number,
      comment: string | null,
      existingId?: string
    ) => {
      if (!monthId) return "Month not loaded";
      const supabase = createClient();
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
      await mutate();
      return null;
    },
    [monthId, mutate]
  );

  const addCommonExpense = useCallback(
    async (amount: number, label: string, existingId?: string) => {
      if (!monthId) return "Month not loaded";
      const supabase = createClient();
      if (existingId) {
        const { error: err } = await supabase
          .from("other_expenses")
          .update({ amount, label })
          .eq("id", existingId);
        if (err) return err.message;
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return "Not signed in";
        const { error: err } = await supabase.from("other_expenses").insert({
          month_id: monthId,
          category: "common",
          label,
          amount,
          split_method: "equal",
          added_by: user.id,
        });
        if (err) return err.message;
      }
      await mutate();
      return null;
    },
    [monthId, mutate]
  );

  const deleteCommonExpense = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("other_expenses")
        .delete()
        .eq("id", id);
      if (err) return err.message;
      await mutate();
      return null;
    },
    [mutate]
  );

  const setHouseRent = useCallback(
    async (userId: string, amount: number) => {
      if (!monthId) return "Month not loaded";
      const supabase = createClient();
      const { error: err } = await supabase.from("member_month").upsert(
        { month_id: monthId, user_id: userId, house_rent: amount },
        { onConflict: "month_id,user_id" }
      );
      if (err) return err.message;
      await mutate();
      return null;
    },
    [monthId, mutate]
  );

  const setPaid = useCallback(
    async (userId: string, isPaid: boolean) => {
      if (!monthId) return "Month not loaded";
      const supabase = createClient();

      const applyPaid = (current?: MonthFetch): MonthFetch => {
        const base: MonthFetch = current ?? {
          monthId,
          monthRow: null,
          meals: [],
          bazar: [],
          duty: [],
          others: [],
          memberMonths: [],
        };
        const i = base.memberMonths.findIndex((m) => m.user_id === userId);
        const memberMonths = [...base.memberMonths];
        if (i >= 0) {
          memberMonths[i] = { ...memberMonths[i], is_paid: isPaid };
        } else {
          memberMonths.push({
            month_id: monthId,
            user_id: userId,
            house_rent: null,
            is_paid: isPaid,
            updated_at: new Date().toISOString(),
          });
        }
        return { ...base, memberMonths };
      };

      try {
        await mutate(
          async (current) => {
            const { error: err } = await supabase.from("member_month").upsert(
              { month_id: monthId, user_id: userId, is_paid: isPaid },
              { onConflict: "month_id,user_id" }
            );
            if (err) throw err;
            return applyPaid(current);
          },
          { optimisticData: applyPaid, revalidate: true, rollbackOnError: true }
        );
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Failed to update";
      }
    },
    [monthId, mutate]
  );

  return {
    monthRow: data?.monthRow ?? null,
    monthId,
    meals: data?.meals ?? [],
    bazar: data?.bazar ?? [],
    duty: data?.duty ?? [],
    others: data?.others ?? [],
    memberMonths: data?.memberMonths ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refetch: async () => {
      await mutate();
    },
    upsertMeal,
    saveBazar,
    addCommonExpense,
    deleteCommonExpense,
    setHouseRent,
    setPaid,
  };
}
