import type { ExpenseCategory } from "@/types/database";

/** PRD Section 08 — Member Colour Assignments, keyed by order_index */
export const MEMBER_COLORS: string[] = [
  "#FF6B6B", // 1 Saiful Azam — Coral Red
  "#6C63FF", // 2 Abul Hayat — Indigo (Admin)
  "#00C896", // 3 Tareq — Emerald
  "#FFD166", // 4 Sumon — Amber
  "#118AB2", // 5 Javed Omar — Ocean Blue
  // extras for future members
  "#EF8354", "#9B5DE5", "#00BBF9", "#F15BB5", "#80B918",
];

export function memberColor(orderIndex: number | null | undefined): string {
  const i = ((orderIndex ?? 1) - 1) % MEMBER_COLORS.length;
  return MEMBER_COLORS[Math.max(0, i)];
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "House Rent",
  electricity: "Electricity Bill",
  gas: "Gas Bill",
  water: "Water Bill",
  custom: "Custom Expense",
};

export const APP_NAME = "Aamader Bari";
export const APP_TAGLINE = "Meal & expense management for our home";
