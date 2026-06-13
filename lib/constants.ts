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
  wifi: "Wifi Bill",
  maid: "Maid (Bua) Bill",
  common: "Common Purchase",
  custom: "Custom Expense",
};

/** Default amounts pre-filled when a fresh month is created (admin can edit). */
export const FIXED_BILL_DEFAULTS: Record<string, number> = {
  maid: 2500,
  wifi: 500,
  electricity: 700,
  water: 500,
};

/**
 * When the month's days don't divide evenly among members, the
 * remainder duty days are assigned to this member (matched by name,
 * case-insensitive). Must match the SQL regenerate_duty_schedule fn.
 */
export const EXTRA_DUTY_MEMBER_NAME = "Saiful Azam";

/**
 * Per-member default house rent (BDT). Keyed by exact full_name.
 * Used as a frontend fallback when profiles.default_rent is 0 or missing
 * (e.g. before migration 0003 / 0007 has been applied).
 * Admin can always override per month from the bill table.
 */
export const DEFAULT_RENTS: Record<string, number> = {
  "Abul Hayat": 2500,
  "Javed Omar": 2500,
  "Jabed Omor": 2500,
  "Saiful Azam": 1667,
  "Sumon": 1667,
  "Tarekul Islam": 1667,
};

/** Fallback rent for any member not in DEFAULT_RENTS. */
export const STANDARD_RENT = 1667;

export const APP_NAME = "Bachelor Home";
export const APP_TAGLINE = "Meal & expense management for our home";
