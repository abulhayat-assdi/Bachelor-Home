export type Role = "member" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: Role;
  order_index: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Month {
  id: string;
  year: number;
  month: number; // 1-12
  is_locked: boolean;
  created_at: string;
}

export interface MealEntry {
  id: string;
  month_id: string;
  user_id: string;
  entry_date: string; // yyyy-mm-dd
  breakfast: number;
  lunch: number;
  dinner: number;
  total_meals: number;
  updated_at: string;
}

export interface DutyDay {
  id: string;
  month_id: string;
  user_id: string;
  duty_date: string;
}

export interface BazarExpense {
  id: string;
  month_id: string;
  shopper_id: string;
  expense_date: string;
  amount: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory = "rent" | "electricity" | "gas" | "water" | "custom";
export type SplitMethod = "equal" | "meal_based";

export interface OtherExpense {
  id: string;
  month_id: string;
  category: ExpenseCategory;
  label: string | null;
  amount: number;
  split_method: SplitMethod;
  added_by: string | null;
  created_at: string;
}

export type NotificationType =
  | "bazar_added"
  | "bazar_updated"
  | "meal_updated"
  | "member_joined"
  | "bill_ready"
  | "month_locked";

export interface AppNotification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
}
