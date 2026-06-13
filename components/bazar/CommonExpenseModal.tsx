"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Member logs a shared NON-food purchase (e.g. cleaning supplies, gas lighter).
 * The item list goes in the label, total in the amount. It joins the common
 * pool (split equally) and counts as this member's deposit.
 */
export function CommonExpenseModal({
  open,
  onOpenChange,
  initialAmount,
  initialLabel,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAmount?: number;
  initialLabel?: string | null;
  onSave: (amount: number, label: string) => Promise<string | null>;
}) {
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(initialAmount != null ? String(initialAmount) : "");
      setLabel(initialLabel ?? "");
      setError(null);
    }
  }, [open, initialAmount, initialLabel]);

  async function handleSave() {
    const value = parseFloat(amount);
    if (isNaN(value) || value < 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!label.trim()) {
      setError("Write what you bought");
      return;
    }
    setSaving(true);
    const err = await onSave(value, label.trim());
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Common expense</DialogTitle>
          <DialogDescription>
            Shared non-food items everyone uses. Split equally among members.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ce-items">Items (with names)</Label>
            <Textarea
              id="ce-items"
              placeholder={"হ্যান্ডওয়াশ – ১২০, ঝাড়ু – ৮০, গ্যাস লাইটার – ৫০ ..."}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ce-amount">Total amount (৳)</Label>
            <Input
              id="ce-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="e.g. 250"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
              {error}
            </p>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save common expense
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
