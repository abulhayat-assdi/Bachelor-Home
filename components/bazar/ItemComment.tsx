"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareText } from "lucide-react";

/** Itemised breakdown note, shown as a tap-to-open popover (PRD 4B). */
export function ItemComment({ comment }: { comment: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-label="Show items"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
      >
        <MessageSquareText className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            className="absolute right-0 top-9 z-30 w-56 rounded-xl border border-border-c bg-bg p-3 text-xs leading-relaxed shadow-xl"
          >
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              Items
            </div>
            <p className="whitespace-pre-wrap text-text">{comment}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
