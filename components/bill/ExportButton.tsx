"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MonthlyBill } from "@/lib/calculations/billCalculator";
import type {
  BazarExpense,
  MealEntry,
  OtherExpense,
  Profile,
} from "@/types/database";

export function ExportButton({
  year,
  month,
  bill,
  bazar,
  others,
  meals,
  profiles,
}: {
  year: number;
  month: number;
  bill: MonthlyBill;
  bazar: BazarExpense[];
  others: OtherExpense[];
  meals: MealEntry[];
  profiles: Profile[];
}) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const { generateBillPdf } = await import("@/lib/pdf/generateBill");
      generateBillPdf({ year, month, bill, bazar, others, meals, profiles });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={handleExport} disabled={busy} className="w-full" size="lg">
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Export PDF bill
    </Button>
  );
}
