"use client";

import { useMonthData } from "./useMonthData";

/** Bazar-focused view of the month data (PRD hook). */
export function useBazar(year: number, month: number) {
  const { bazar, duty, monthRow, loading, error, saveBazar, refetch } =
    useMonthData(year, month);
  return { bazar, duty, monthRow, loading, error, saveBazar, refetch };
}
