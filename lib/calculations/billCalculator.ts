import type {
  BazarExpense,
  ExpenseCategory,
  MealEntry,
  MemberMonth,
  OtherExpense,
  Profile,
} from "@/types/database";
import {
  CATEGORY_LABELS,
  DEFAULT_RENTS,
  FIXED_BILL_DEFAULTS,
  STANDARD_RENT,
} from "@/lib/constants";
import { grandTotalMeals, mealRate, totalBazar } from "./mealRate";

const FIXED_ORDER: ExpenseCategory[] = [
  "maid",
  "wifi",
  "electricity",
  "water",
  "gas",
  "custom",
];

/**
 * The month's fixed common bills, with default amounts filled in for any
 * category that has no saved row yet. This keeps the seeded defaults visible
 * (and counted) even before the admin touches them or the DB is seeded.
 */
export function effectiveFixedBills(others: OtherExpense[]): OtherExpense[] {
  const real = others.filter(
    (e) => e.category !== "common" && e.category !== "rent"
  );
  const present = new Set(real.map((e) => e.category));
  const synthetic: OtherExpense[] = (
    Object.keys(FIXED_BILL_DEFAULTS) as ExpenseCategory[]
  )
    .filter((cat) => !present.has(cat))
    .map((cat) => ({
      id: `default-${cat}`,
      month_id: "",
      category: cat,
      label: CATEGORY_LABELS[cat],
      amount: FIXED_BILL_DEFAULTS[cat],
      split_method: "equal",
      added_by: null,
      created_at: "",
    }));
  return [...real, ...synthetic].sort(
    (a, b) => FIXED_ORDER.indexOf(a.category) - FIXED_ORDER.indexOf(b.category)
  );
}

export interface MemberBill {
  profile: Profile;
  meals: number;
  mealExpense: number; // personal meals × meal rate
  commonShare: number; // equal share of the common pool
  houseRent: number; // per-member (override or default)
  totalDue: number; // mealExpense + commonShare + houseRent
  bazarSpent: number; // food bazar this member paid
  commonPurchase: number; // shared non-food this member paid
  deposit: number; // bazarSpent + commonPurchase
  balance: number; // deposit − totalDue (negative ⇒ must pay)
  isPaid: boolean;
}

export interface MonthlyBill {
  totalBazar: number; // food bazar
  totalMeals: number;
  mealRate: number;
  fixedBillsTotal: number; // maid/wifi/electricity/water/gas (admin)
  memberCommonTotal: number; // members' shared non-food purchases
  commonPool: number; // fixedBillsTotal + memberCommonTotal (split equal)
  commonShare: number; // commonPool ÷ memberCount
  totalHouseRent: number;
  memberCount: number;
  members: MemberBill[];
  grandTotalDue: number;
  totalDeposit: number;
  totalBalance: number;
}

/**
 * Spreadsheet model (Aamader Bari):
 *   Meal Expense   = personal meals × meal rate
 *   Common Expense = (fixed bills + members' shared purchases) ÷ members  [equal]
 *   House Rent     = per-member value (admin override, else default)
 *   Total Due      = Meal Expense + Common Expense + House Rent
 *   Deposit        = own bazar (food) + own common purchases
 *   Balance        = Deposit − Total Due   (negative ⇒ owes money)
 */
export function calculateMonthlyBill(
  profiles: Profile[],
  meals: MealEntry[],
  bazar: BazarExpense[],
  others: OtherExpense[],
  memberMonths: MemberMonth[] = []
): MonthlyBill {
  const active = profiles
    .filter((p) => p.is_active)
    .sort((a, b) => (a.order_index ?? 99) - (b.order_index ?? 99));

  const tBazar = totalBazar(bazar);
  const tMeals = grandTotalMeals(meals);
  const rate = mealRate(bazar, meals);

  // Common pool = everything in other_expenses except per-member house rent.
  const memberCommonTotal = others
    .filter((e) => e.category === "common")
    .reduce((s, e) => s + Number(e.amount), 0);
  // Use only real DB rows here (not the synthetic display defaults from
  // effectiveFixedBills) so the calculation is always consistent with the
  // data that has actually been persisted. effectiveFixedBills() is kept for
  // the UI breakdown only.
  const fixedBillsTotal = others
    .filter((e) => e.category !== "common" && e.category !== "rent")
    .reduce((s, e) => s + Number(e.amount), 0);
  const commonPool = fixedBillsTotal + memberCommonTotal;

  const memberCount = active.length;
  const commonShare = memberCount > 0 ? commonPool / memberCount : 0;

  const defaultRentFor = (p: Profile) => {
    if (p.default_rent > 0) return p.default_rent;
    return DEFAULT_RENTS[p.full_name.trim()] ?? STANDARD_RENT;
  };

  const rentOf = (userId: string, fallback: number) => {
    const mm = memberMonths.find((m) => m.user_id === userId);
    return mm?.house_rent != null ? Number(mm.house_rent) : fallback;
  };
  const paidOf = (userId: string) =>
    memberMonths.find((m) => m.user_id === userId)?.is_paid ?? false;

  const members: MemberBill[] = active.map((p) => {
    const personalMeals = meals
      .filter((m) => m.user_id === p.id)
      .reduce(
        (s, m) => s + Number(m.breakfast) + Number(m.lunch) + Number(m.dinner),
        0
      );
    const mealExpense = personalMeals * rate;
    const houseRent = rentOf(p.id, defaultRentFor(p));
    const totalDue = mealExpense + commonShare + houseRent;

    const bazarSpent = bazar
      .filter((b) => b.shopper_id === p.id)
      .reduce((s, b) => s + Number(b.amount), 0);
    const commonPurchase = others
      .filter((e) => e.category === "common" && e.added_by === p.id)
      .reduce((s, e) => s + Number(e.amount), 0);
    const deposit = bazarSpent + commonPurchase;

    return {
      profile: p,
      meals: personalMeals,
      mealExpense,
      commonShare,
      houseRent,
      totalDue,
      bazarSpent,
      commonPurchase,
      deposit,
      balance: deposit - totalDue,
      isPaid: paidOf(p.id),
    };
  });

  return {
    totalBazar: tBazar,
    totalMeals: tMeals,
    mealRate: rate,
    fixedBillsTotal,
    memberCommonTotal,
    commonPool,
    commonShare,
    totalHouseRent: members.reduce((s, m) => s + m.houseRent, 0),
    memberCount,
    members,
    grandTotalDue: members.reduce((s, m) => s + m.totalDue, 0),
    totalDeposit: members.reduce((s, m) => s + m.deposit, 0),
    totalBalance: members.reduce((s, m) => s + m.balance, 0),
  };
}
