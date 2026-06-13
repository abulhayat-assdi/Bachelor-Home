import { EXTRA_DUTY_MEMBER_NAME } from "@/lib/constants";
import { daysInMonth, isoDate } from "@/lib/utils";
import type { Profile } from "@/types/database";

export interface DutyBlock {
  userId: string;
  name: string;
  days: number;
  from: string; // yyyy-mm-dd
  to: string;
}

/**
 * PRD 4B — days_in_month ÷ member_count (in member serial order), as
 * consecutive date blocks. Remainder days go to Saiful Azam; if he is
 * not an active member, they fall back to the first members in order.
 * (Mirrors the regenerate_duty_schedule SQL function.)
 */
export function computeDutyBlocks(
  year: number,
  month: number,
  members: Profile[]
): DutyBlock[] {
  const active = [...members]
    .filter((m) => m.is_active)
    .sort((a, b) => (a.order_index ?? 99) - (b.order_index ?? 99));
  const days = daysInMonth(year, month);
  const count = active.length;
  if (count === 0) return [];

  const base = Math.floor(days / count);
  const rem = days % count;
  const extraIdx = active.findIndex(
    (m) =>
      m.full_name.trim().toLowerCase() ===
      EXTRA_DUTY_MEMBER_NAME.toLowerCase()
  );
  const blocks: DutyBlock[] = [];
  let day = 1;
  active.forEach((m, i) => {
    const take =
      base +
      (extraIdx >= 0 ? (i === extraIdx ? rem : 0) : i < rem ? 1 : 0);
    blocks.push({
      userId: m.id,
      name: m.full_name,
      days: take,
      from: isoDate(year, month, day),
      to: isoDate(year, month, day + take - 1),
    });
    day += take;
  });
  return blocks;
}
