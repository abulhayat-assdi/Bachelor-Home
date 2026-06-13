"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  effectiveFixedBills,
  type MonthlyBill,
  type MemberBill,
} from "@/lib/calculations/billCalculator";
import type { OtherExpense } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/constants";

/** Sheet-style money: rounded, thousands-separated, no decimals. */
const money = (x: number) => Math.round(x).toLocaleString("en-IN");
const rate = (x: number) => x.toFixed(2);
const meals = (x: number) => (x > 0 ? x.toFixed(2) : "–");
const dash = (x: number, f: (n: number) => string) => (x > 0 ? f(x) : "–");

export function BillSummary({
  bill,
  others,
  meId,
  isAdmin,
  onSetRent,
  onSetPaid,
}: {
  bill: MonthlyBill;
  others: OtherExpense[];
  meId: string | null;
  isAdmin: boolean;
  onSetRent: (userId: string, amount: number) => Promise<string | null>;
  onSetPaid: (userId: string, isPaid: boolean) => Promise<string | null>;
}) {
  const fixedBills = effectiveFixedBills(others);

  return (
    <div className="flex flex-col gap-5">
      {/* ============ Main household table ============ */}
      <div>
        <h2 className="mb-2 text-sm font-extrabold text-primary">
          Monthly Household Expenses
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border-c shadow-card dark:shadow-card-dark">
          <table className="w-full border-collapse text-right text-xs [&_td]:border [&_td]:border-border-c [&_th]:border [&_th]:border-border-c">
            <thead>
              <tr className="bg-primary/10 text-primary">
                <Th className="text-left">Name</Th>
                <Th>Meal</Th>
                <Th>Rate</Th>
                <Th>Meal Exp.</Th>
                <Th>Common</Th>
                <Th>House Rent</Th>
                <Th>Total</Th>
                <Th>Deposit</Th>
                <Th>Pay / Get</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {bill.members.map((m) => (
                <MemberRow
                  key={m.profile.id}
                  m={m}
                  rateValue={bill.mealRate}
                  isMe={m.profile.id === meId}
                  isAdmin={isAdmin}
                  onSetRent={onSetRent}
                  onSetPaid={onSetPaid}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-c bg-surface font-extrabold">
                <Td className="text-left">Total</Td>
                <Td>{bill.totalMeals.toFixed(2)}</Td>
                <Td>{rate(bill.mealRate)}</Td>
                <Td>{money(bill.totalBazar)}</Td>
                <Td>{money(bill.commonPool)}</Td>
                <Td>{money(bill.totalHouseRent)}</Td>
                <Td>{money(bill.grandTotalDue)}</Td>
                <Td>{money(bill.totalDeposit)}</Td>
                <Td className="text-accent">
                  ({money(Math.abs(bill.totalBalance))})
                </Td>
                <Td />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-1.5 text-[10px] text-muted">
          Amount in ( ) = still to pay. Mess members: {bill.memberCount}
        </p>
      </div>

      {/* ============ Common Expenses breakdown ============ */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-secondary/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-secondary">
            Common Expenses
          </div>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {fixedBills.map((e) => (
                <tr key={e.id} className="border-b border-border-c">
                  <Td className="text-left font-medium">
                    {CATEGORY_LABELS[e.category]}
                  </Td>
                  <Td className="text-right">{money(Number(e.amount))}</Td>
                </tr>
              ))}
              <tr className="border-b border-border-c bg-primary/5">
                <Td className="text-left font-semibold">
                  Other Expenses (members&apos; shared)
                </Td>
                <Td className="text-right font-semibold">
                  {money(bill.memberCommonTotal)}
                </Td>
              </tr>
              <tr className="bg-surface font-extrabold">
                <Td className="text-left">Total</Td>
                <Td className="text-right">{money(bill.commonPool)}</Td>
              </tr>
              <tr>
                <Td className="text-left text-[11px] text-muted">
                  Per member ÷ {bill.memberCount} (equal)
                </Td>
                <Td className="text-right text-[11px] font-bold text-muted">
                  {money(bill.commonShare)}
                </Td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ============ Expense data (monthly) ============ */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-secondary/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-secondary">
            Expense data (monthly)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className="text-muted">
                  <Th className="text-left">Name</Th>
                  <Th>Meal</Th>
                  <Th>Bazar</Th>
                  <Th>Other</Th>
                </tr>
              </thead>
              <tbody>
                {bill.members.map((m) => (
                  <tr key={m.profile.id} className="border-t border-border-c">
                    <Td className="text-left font-medium">
                      {m.profile.full_name}
                    </Td>
                    <Td>{meals(m.meals)}</Td>
                    <Td>{dash(m.bazarSpent, money)}</Td>
                    <Td>{dash(m.commonPurchase, money)}</Td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border-c bg-surface font-extrabold">
                  <Td className="text-left">Total</Td>
                  <Td>{bill.totalMeals.toFixed(2)}</Td>
                  <Td>{money(bill.totalBazar)}</Td>
                  <Td>{money(bill.memberCommonTotal)}</Td>
                </tr>
                <tr>
                  <Td className="text-left text-[11px] text-muted">Meal Rate</Td>
                  <Td className="text-[11px] font-bold text-primary" colSpan={3}>
                    ৳{rate(bill.mealRate)} / meal
                  </Td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({
  m,
  rateValue,
  isMe,
  isAdmin,
  onSetRent,
  onSetPaid,
}: {
  m: MemberBill;
  rateValue: number;
  isMe: boolean;
  isAdmin: boolean;
  onSetRent: (userId: string, amount: number) => Promise<string | null>;
  onSetPaid: (userId: string, isPaid: boolean) => Promise<string | null>;
}) {
  const owes = m.balance < 0;
  return (
    <tr
      className={`border-t border-border-c ${isMe ? "bg-primary/5" : ""}`}
    >
      <Td className="text-left font-semibold">
        {m.profile.full_name}
        {isMe && <span className="ml-1 text-[10px] text-primary">(you)</span>}
      </Td>
      <Td>{meals(m.meals)}</Td>
      <Td className="text-muted">{rate(rateValue)}</Td>
      <Td>{dash(m.mealExpense, money)}</Td>
      <Td>{money(m.commonShare)}</Td>
      <RentCell m={m} isAdmin={isAdmin} onSetRent={onSetRent} />
      <Td className="font-bold">{money(m.totalDue)}</Td>
      <Td>{dash(m.deposit, money)}</Td>
      <Td className={`font-extrabold ${owes ? "text-accent" : "text-secondary"}`}>
        {owes ? `(${money(-m.balance)})` : money(m.balance)}
      </Td>
      <Td className="text-center">
        <PaidControl m={m} isAdmin={isAdmin} onSetPaid={onSetPaid} />
      </Td>
    </tr>
  );
}

function PaidControl({
  m,
  isAdmin,
  onSetPaid,
}: {
  m: MemberBill;
  isAdmin: boolean;
  onSetPaid: (userId: string, isPaid: boolean) => Promise<string | null>;
}) {
  const [busy, setBusy] = useState(false);
  const cls = m.isPaid
    ? "bg-secondary/15 text-secondary"
    : "bg-accent/15 text-accent";
  if (!isAdmin) {
    return (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>
        {m.isPaid ? "Paid" : "Unpaid"}
      </span>
    );
  }
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await onSetPaid(m.profile.id, !m.isPaid);
        setBusy(false);
      }}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}
    >
      {busy ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : m.isPaid ? (
        <Check className="h-2.5 w-2.5" />
      ) : null}
      {m.isPaid ? "Paid" : "Unpaid"}
    </button>
  );
}

function RentCell({
  m,
  isAdmin,
  onSetRent,
}: {
  m: MemberBill;
  isAdmin: boolean;
  onSetRent: (userId: string, amount: number) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(m.houseRent));
  const [busy, setBusy] = useState(false);

  // Keep the displayed value in sync with SWR revalidations that happen
  // while the field is not being actively edited.
  useEffect(() => {
    if (!editing) setValue(String(m.houseRent));
  }, [m.houseRent, editing]);

  async function commit() {
    const n = parseFloat(value);
    if (!isNaN(n) && n >= 0 && n !== m.houseRent) {
      setBusy(true);
      await onSetRent(m.profile.id, n);
      setBusy(false);
    }
    setEditing(false);
  }

  if (isAdmin && editing) {
    return (
      <Td>
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-16 rounded-md border border-primary bg-bg px-1 py-0.5 text-right text-xs outline-none"
        />
      </Td>
    );
  }

  return (
    <Td>
      <button
        disabled={!isAdmin}
        onClick={() => {
          setValue(String(m.houseRent));
          setEditing(true);
        }}
        className={isAdmin ? "underline decoration-dotted underline-offset-2" : ""}
      >
        {busy ? (
          <Loader2 className="inline h-3 w-3 animate-spin" />
        ) : (
          money(m.houseRent)
        )}
      </button>
    </Td>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`whitespace-nowrap px-2.5 py-2 ${className}`}
    >
      {children}
    </td>
  );
}
