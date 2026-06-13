"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ExpenseCategory, OtherExpense } from "@/types/database";
import { FIXED_BILL_CATEGORIES } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, FIXED_BILL_DEFAULTS } from "@/lib/constants";

/**
 * Admin editor for the month's fixed common bills (maid / wifi / electricity /
 * water / gas). Amounts are pre-seeded with defaults; editing here updates the
 * bill instantly. Split equally among members on the bill above.
 */
export function FixedBillsEditor({
  others,
  monthId,
  meId,
  onChanged,
}: {
  others: OtherExpense[];
  monthId: string | null;
  meId: string;
  onChanged: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<ExpenseCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rowFor = (cat: ExpenseCategory) =>
    others.find((e) => e.category === cat);

  // What the input shows: typed value → saved row → seeded default.
  const shown = (cat: ExpenseCategory) => {
    if (values[cat] !== undefined) return values[cat];
    const existing = rowFor(cat);
    if (existing) return String(Number(existing.amount));
    const def = FIXED_BILL_DEFAULTS[cat];
    return def != null ? String(def) : "";
  };

  async function save(cat: ExpenseCategory) {
    if (!monthId) return;
    const amount = parseFloat(shown(cat));
    if (isNaN(amount) || amount < 0) {
      setError("Enter a valid amount");
      return;
    }
    setBusy(cat);
    setError(null);
    const supabase = createClient();
    const existing = rowFor(cat);
    const { error: err } = existing
      ? await supabase
          .from("other_expenses")
          .update({ amount })
          .eq("id", existing.id)
      : await supabase.from("other_expenses").insert({
          month_id: monthId,
          category: cat,
          label: CATEGORY_LABELS[cat],
          amount,
          split_method: "equal",
          added_by: meId,
        });
    setBusy(null);
    if (err) {
      setError(err.message);
      return;
    }
    setValues((v) => ({ ...v, [cat]: "" }));
    onChanged();
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
          Fixed common bills (admin)
        </div>
        <div className="flex flex-col gap-2">
          {FIXED_BILL_CATEGORIES.map((cat) => {
            const existing = rowFor(cat);
            return (
              <div key={cat} className="flex items-center gap-2">
                <span className="flex-1 text-sm font-medium">
                  {CATEGORY_LABELS[cat]}
                  {!existing && FIXED_BILL_DEFAULTS[cat] != null && (
                    <span className="ml-1.5 text-[10px] font-normal text-muted">
                      default
                    </span>
                  )}
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={shown(cat)}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [cat]: e.target.value }))
                  }
                  className="h-9 w-28 text-right"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === cat}
                  onClick={() => save(cat)}
                >
                  {busy === cat ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        {error && (
          <p className="mt-2 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
