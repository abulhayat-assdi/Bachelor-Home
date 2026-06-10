import type {
  BazarExpense,
  MealEntry,
  OtherExpense,
  Profile,
} from "@/types/database";
import { grandTotalMeals, mealRate, totalBazar } from "./mealRate";

export interface MemberBill {
  profile: Profile;
  meals: number;
  mealCost: number;
  fixedShare: number;
  customShare: number;
  total: number;
}

export interface MonthlyBill {
  totalBazar: number;
  totalMeals: number;
  mealRate: number;
  equalPool: number; // rent + utilities + custom(equal)
  mealBasedPool: number; // custom(meal_based)
  memberCount: number;
  members: MemberBill[];
  grandTotal: number;
}

/**
 * PRD 4C — Personal Bill =
 *   (Personal Meals × Meal Rate)
 * + (Equal-split Expenses ÷ Total Members)
 * + (Personal Share of meal-based Custom Expenses)
 */
export function calculateMonthlyBill(
  profiles: Profile[],
  meals: MealEntry[],
  bazar: BazarExpense[],
  others: OtherExpense[]
): MonthlyBill {
  const active = profiles
    .filter((p) => p.is_active)
    .sort((a, b) => (a.order_index ?? 99) - (b.order_index ?? 99));

  const tBazar = totalBazar(bazar);
  const tMeals = grandTotalMeals(meals);
  const rate = mealRate(bazar, meals);

  const equalPool = others
    .filter((e) => e.category !== "custom" || e.split_method === "equal")
    .reduce((s, e) => s + Number(e.amount), 0);
  const mealBasedPool = others
    .filter((e) => e.category === "custom" && e.split_method === "meal_based")
    .reduce((s, e) => s + Number(e.amount), 0);

  const memberCount = active.length;

  const members: MemberBill[] = active.map((p) => {
    const personalMeals = meals
      .filter((m) => m.user_id === p.id)
      .reduce(
        (s, m) => s + Number(m.breakfast) + Number(m.lunch) + Number(m.dinner),
        0
      );
    const mealCost = personalMeals * rate;
    const fixedShare = memberCount > 0 ? equalPool / memberCount : 0;
    const customShare =
      tMeals > 0 ? (personalMeals / tMeals) * mealBasedPool : 0;
    return {
      profile: p,
      meals: personalMeals,
      mealCost,
      fixedShare,
      customShare,
      total: mealCost + fixedShare + customShare,
    };
  });

  return {
    totalBazar: tBazar,
    totalMeals: tMeals,
    mealRate: rate,
    equalPool,
    mealBasedPool,
    memberCount,
    members,
    grandTotal: members.reduce((s, m) => s + m.total, 0),
  };
}
