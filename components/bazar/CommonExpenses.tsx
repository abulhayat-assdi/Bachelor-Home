"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { OtherExpense, Profile } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { CommonExpenseModal } from "./CommonExpenseModal";
import { memberColor } from "@/lib/constants";
import { formatMoney, shortDate } from "@/lib/utils";

/**
 * Members' shared non-food purchases. In "mine" scope the user can add / edit /
 * delete their own; in "everyone" scope it's a read-only list of all members'.
 */
export function CommonExpenses({
  items,
  profiles,
  meId,
  scope,
  isLocked,
  onSave,
  onDelete,
}: {
  items: OtherExpense[];
  profiles: Profile[];
  meId: string | null;
  scope: "mine" | "everyone";
  isLocked: boolean;
  onSave: (
    amount: number,
    label: string,
    existingId?: string
  ) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const [modal, setModal] = useState<{ existing?: OtherExpense } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const profileOf = (id: string | null) =>
    profiles.find((p) => p.id === id);

  const list = (
    scope === "mine" ? items.filter((e) => e.added_by === meId) : items
  )
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const canManage = scope === "mine" && !isLocked;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold">Common (non-food) expenses</h2>
        {canManage && (
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-5 text-center text-xs text-muted shadow-card dark:shadow-card-dark">
          No common purchases {scope === "mine" ? "by you " : ""}this month.
        </p>
      ) : (
        list.map((e) => {
          const who = profileOf(e.added_by);
          const mine = e.added_by === meId;
          return (
            <div
              key={e.id}
              className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card dark:shadow-card-dark"
            >
              <Avatar
                name={who?.full_name ?? "?"}
                src={who?.avatar_url}
                color={memberColor(who?.order_index)}
                size={30}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {who?.full_name ?? "Unknown"}
                  <span className="text-[10px] font-normal text-muted">
                    {shortDate(e.created_at.slice(0, 10))}
                  </span>
                </div>
                <div className="text-sm font-extrabold">
                  {formatMoney(Number(e.amount))}
                </div>
                {e.label && (
                  <div className="mt-0.5 whitespace-pre-wrap text-[11px] leading-snug text-muted">
                    {e.label}
                  </div>
                )}
              </div>
              {canManage && mine && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    aria-label="Edit"
                    onClick={() => setModal({ existing: e })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Delete"
                    disabled={deletingId === e.id}
                    onClick={async () => {
                      setDeletingId(e.id);
                      await onDelete(e.id);
                      setDeletingId(null);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-accent hover:bg-accent/10"
                  >
                    {deletingId === e.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}

      {modal && (
        <CommonExpenseModal
          open={!!modal}
          onOpenChange={(o) => !o && setModal(null)}
          initialAmount={
            modal.existing ? Number(modal.existing.amount) : undefined
          }
          initialLabel={modal.existing?.label}
          onSave={(amount, label) =>
            onSave(amount, label, modal.existing?.id)
          }
        />
      )}
    </div>
  );
}
