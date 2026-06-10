"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { ExpenseCategory, OtherExpense, SplitMethod } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";

export function ExpenseManager({
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
  const [category, setCategory] = useState<ExpenseCategory>("rent");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [split, setSplit] = useState<SplitMethod>("equal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!monthId) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value < 0) {
      setError("Enter a valid amount");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("other_expenses").insert({
      month_id: monthId,
      category,
      label: category === "custom" ? label.trim() || "Custom" : null,
      amount: value,
      // PRD 4C: fixed categories always split equally; custom is admin's choice
      split_method: category === "custom" ? split : "equal",
      added_by: meId,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setAmount("");
    setLabel("");
    onChanged();
  }

  async function remove(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("other_expenses").delete().eq("id", id);
    setDeletingId(null);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
            Add Expense
          </div>
          <form onSubmit={addExpense} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ExpenseCategory)
                }
              >
                {(
                  Object.keys(CATEGORY_LABELS) as ExpenseCategory[]
                ).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            {category === "custom" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="e-label">Label</Label>
                  <Input
                    id="e-label"
                    placeholder="e.g. Wifi bill"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Split method</Label>
                  <Select
                    value={split}
                    onChange={(e) => setSplit(e.target.value as SplitMethod)}
                  >
                    <option value="equal">Equal per head</option>
                    <option value="meal_based">Meal-based (proportional)</option>
                  </Select>
                </div>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-amount">Amount (৳)</Label>
              <Input
                id="e-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add expense
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-muted">
            This month&apos;s expenses
          </div>
          {others.length === 0 ? (
            <p className="px-1 pb-2 text-xs text-muted">Nothing added yet.</p>
          ) : (
            others.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-xl px-2 py-2"
              >
                <div>
                  <div className="text-sm font-semibold">
                    {e.category === "custom"
                      ? e.label ?? "Custom"
                      : CATEGORY_LABELS[e.category]}
                  </div>
                  <div className="text-[10px] text-muted">
                    {e.split_method === "equal"
                      ? "equal per head"
                      : "meal-based"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {formatMoney(Number(e.amount))}
                  </span>
                  <button
                    aria-label="Delete expense"
                    disabled={deletingId === e.id}
                    onClick={() => remove(e.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-accent hover:bg-accent/10"
                  >
                    {deletingId === e.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
