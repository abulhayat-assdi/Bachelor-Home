"use client";

import { useMemo } from "react";
import { useMonthData } from "./useMonthData";
import { useProfiles } from "./useProfiles";
import { calculateMonthlyBill } from "@/lib/calculations/billCalculator";

/** Computes the full monthly bill (PRD hook). */
export function useBill(year: number, month: number) {
  const data = useMonthData(year, month);
  const { profiles, me, loading: profilesLoading } = useProfiles();

  const bill = useMemo(
    () =>
      calculateMonthlyBill(profiles, data.meals, data.bazar, data.others),
    [profiles, data.meals, data.bazar, data.others]
  );

  return {
    ...data,
    profiles,
    me,
    bill,
    loading: data.loading || profilesLoading,
  };
}
