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
import { shortDate } from "@/lib/utils";

export function BazarEntryModal({
  open,
  onOpenChange,
  date,
  shopperName,
  initialAmount,
  initialComment,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  shopperName: string;
  initialAmount?: number;
  initialComment?: string | null;
  onSave: (amount: number, comment: string | null) => Promise<string | null>;
}) {
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(initialAmount != null ? String(initialAmount) : "");
      setComment(initialComment ?? "");
      setError(null);
    }
  }, [open, initialAmount, initialComment]);

  async function handleSave() {
    const value = parseFloat(amount);
    if (isNaN(value) || value < 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    const err = await onSave(value, comment.trim() || null);
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
          <DialogTitle>Bazar — {shortDate(date)}</DialogTitle>
          <DialogDescription>Shopper: {shopperName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Total amount (৳)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="e.g. 1250"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comment">
              Itemised breakdown{" "}
              <span className="font-normal text-muted">(optional)</span>
            </Label>
            <Textarea
              id="comment"
              placeholder={"চাল – ৫০০, ডাল – ১২০, মাছ – ৪৫০ ..."}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
              {error}
            </p>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save expense
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
