"use client";

import { useMonthData } from "./useMonthData";

/** Meal-focused view of the month data (PRD hook). */
export function useMeals(year: number, month: number) {
  const { meals, monthRow, loading, error, upsertMeal, refetch } = useMonthData(
    year,
    month
  );
  return { meals, monthRow, loading, error, upsertMeal, refetch };
}
