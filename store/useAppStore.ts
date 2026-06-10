"use client";

import { create } from "zustand";

interface AppState {
  year: number;
  month: number; // 1-12
  setMonth: (year: number, month: number) => void;
  nextMonth: () => void;
  prevMonth: () => void;
}

const now = new Date();

export const useAppStore = create<AppState>((set) => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  setMonth: (year, month) => set({ year, month }),
  nextMonth: () =>
    set((s) =>
      s.month === 12 ? { year: s.year + 1, month: 1 } : { month: s.month + 1 }
    ),
  prevMonth: () =>
    set((s) =>
      s.month === 1 ? { year: s.year - 1, month: 12 } : { month: s.month - 1 }
    ),
}));
