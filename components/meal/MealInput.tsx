"use client";

import { Minus, Plus } from "lucide-react";
import { formatMeals } from "@/lib/utils";

/** +/- stepper for one meal slot (PRD 4A: tap buttons, min 0, no upper limit). */
export function MealInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          aria-label={`Decrease ${label}`}
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg text-text shadow-sm transition-transform active:scale-90 disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-8 text-center text-base font-extrabold tabular-nums">
          {formatMeals(value)}
        </span>
        <button
          aria-label={`Increase ${label}`}
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white shadow-sm transition-transform active:scale-90 disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
