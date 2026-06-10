import type { BazarExpense, MealEntry } from "@/types/database";

/** PRD: Meal Rate = Total Bazar Expense ÷ Grand Total Meals */
export function totalBazar(expenses: BazarExpense[]): number {
  return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
}

export function grandTotalMeals(entries: MealEntry[]): number {
  return entries.reduce(
    (sum, e) => sum + Number(e.breakfast) + Number(e.lunch) + Number(e.dinner),
    0
  );
}

export function mealRate(expenses: BazarExpense[], entries: MealEntry[]): number {
  const meals = grandTotalMeals(entries);
  if (meals <= 0) return 0;
  return totalBazar(expenses) / meals;
}
