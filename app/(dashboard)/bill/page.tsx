"use client";

import { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useBill } from "@/hooks/useBill";
import { createClient } from "@/lib/supabase/client";
import { MonthSwitcher } from "@/components/shared/MonthSwitcher";
import { BillSummary } from "@/components/bill/BillSummary";
import { ExportButton } from "@/components/bill/ExportButton";
import { FixedBillsEditor } from "@/components/bill/FixedBillsEditor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillPage() {
  const { year, month } = useAppStore();
  const {
    bill,
    bazar,
    others,
    meals,
    profiles,
    me,
    monthRow,
    monthId,
    loading,
    refetch,
    setHouseRent,
    setPaid,
  } = useBill(year, month);
  const isAdmin = me?.role === "admin";
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  async function notifyBillReady() {
    if (!monthId) return;
    setNotifying(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("notify_bill_ready", {
      p_month_id: monthId,
    });
    setNotifying(false);
    if (!error) setNotified(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher isLocked={monthRow?.is_locked} />
      <div>
        <h1 className="text-xl font-extrabold">Monthly Bill</h1>
        <p className="text-xs text-muted">
          Meal expense + common expenses + house rent = each member&apos;s total.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <BillSummary
            bill={bill}
            others={others}
            meId={me?.id ?? null}
            isAdmin={isAdmin}
            onSetRent={setHouseRent}
            onSetPaid={setPaid}
          />

          {/* Admin: edit the month's fixed common bills. Updates the bill above. */}
          {isAdmin && me && !monthRow?.is_locked && (
            <FixedBillsEditor
              others={others}
              monthId={monthId}
              meId={me.id}
              onChanged={refetch}
            />
          )}

          <ExportButton
            year={year}
            month={month}
            bill={bill}
            bazar={bazar}
            others={others}
            meals={meals}
            profiles={profiles}
          />
          {me?.role === "admin" && (
            <Button
              variant="outline"
              onClick={notifyBillReady}
              disabled={notifying || notified}
            >
              {notifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              {notified
                ? "Members notified ✓"
                : "Notify members — bill is ready"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
