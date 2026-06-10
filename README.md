# 🏠 Aamader Bari — Meal & Expense Management

A mobile-first web app for our shared house to track **daily meals**, **bazar (grocery) expenses** and the **monthly bill** — replacing the old Google Sheets workflow. Built exactly per the PRD v1.0 (10 June 2026).

**Stack:** Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · Framer Motion · Supabase (Postgres + Auth + Realtime + Storage, RLS) · Zustand · jsPDF · Vercel

---

## ✨ Features

- 🍚 **Meal Tracker** — tap +/- for your own Breakfast/Lunch/Dinner. Others' cells are read-only (lock icon). Future dates locked until the day arrives. Past edits are logged. All totals auto-calculated.
- 🛒 **Bazar Tracker** — the month's days are auto-divided among members (remainder to the first members, consecutive blocks). Only the assigned shopper can enter their day's amount, with an optional itemised comment (shown as a popover). Admin can override/reassign.
- 🧾 **Monthly Bill** — `Personal Bill = (Meals × Meal Rate) + (Fixed ÷ Members) + (Meal-based custom share)` where `Meal Rate = Total Bazar ÷ Total Meals`. One-tap **PDF export** with full breakdown.
- 🔔 **Real-time notifications** — bazar added/updated, meal updates (deduped), member joined, bill ready, month locked. Live badge on the bell.
- 👑 **Admin panel** — invite members (auto-added to current month + schedule recalculated), duty schedule editor, rent/utility/custom expense manager (equal or meal-based split), month lock/unlock.
- 🌗 **Dark + Light theme**, member colour coding, animated card UI, bottom tab navigation — 100% mobile-first (390px baseline).
- 🔐 **Security** — Supabase RLS enforces every rule at the DB level (each user can only write their own rows); the frontend checks again (defence in depth). Locked months reject all edits in the DB itself.

---

## 🚀 Setup (one-time, ~15 minutes)

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (e.g. `aamader-bari`).
2. Open **SQL Editor** and run, in order:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — all tables, RLS policies, triggers, duty-schedule generator, notification system, realtime, avatars bucket.
   - [`supabase/seed.sql`](supabase/seed.sql) — the 5 initial members (Saiful Azam, **Abul Hayat = Super Admin**, Tareq, Sumon, Javed Omar).

### 2. Configure Auth

1. **Authentication → Providers → Email**: enabled (default).
2. **Authentication → Providers → Google**: enable it. Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com) (OAuth client → Web), set the redirect URL shown by Supabase, paste Client ID/Secret.
3. **Authentication → URL Configuration**: set Site URL to your app URL (e.g. `https://aamaderbari.vercel.app`) and add `http://localhost:3000` to Redirect URLs for local dev.

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in from **Supabase → Settings → API**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (server only!) |
| `NEXT_PUBLIC_APP_URL` | Deployed URL (or `http://localhost:3000`) |

### 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll land on the login page.

### 5. First login (important!)

The 5 members' Gmail addresses are pre-seeded. Each member simply taps **"Continue with Google"** with their own Gmail — their profile is created automatically with the right name, role and order. (Abul Hayat automatically becomes Super Admin.) Email+password also works once a password is set (invite email, or Google first then set a password in Profile).

### 6. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → New Project → import the repo.
3. Add the same 4 environment variables (set `NEXT_PUBLIC_APP_URL` to the production URL).
4. Deploy. Auto-deploys on every push to `main`.
5. Add the production URL to Supabase Auth Redirect URLs.

---

## 📁 Project structure

```
app/
  (auth)/login/            # Email+password & Google OAuth login
  (dashboard)/             # Authed shell: TopBar + BottomNav
    page.tsx               # Dashboard — summary cards, quick actions
    meal/  bazar/  bill/   # The 3 data modules
    admin/  profile/  notifications/
  api/admin/add-member/    # Invite member (service role, admin-only)
  auth/callback/           # OAuth/invite code exchange
components/
  ui/        # button, card, dialog, input, ... (shadcn-style)
  meal/      # MealGrid, DayCard, MealInput
  bazar/     # BazarList, BazarEntryModal, ItemComment
  bill/      # BillSummary, ExportButton
  admin/     # MemberManager, ScheduleEditor, ExpenseManager
  layout/    # TopBar, BottomNav
  shared/    # ThemeToggle, NotificationBell, MonthSwitcher, Logo
lib/
  supabase/      # browser / server / admin clients + middleware
  calculations/  # mealRate, billCalculator, bazarSchedule
  pdf/           # generateBill (jsPDF)
hooks/       # useMonthData, useProfiles, useMeals, useBazar, useBill, useNotifications
store/       # Zustand (selected month)
supabase/    # migrations + seed
middleware.ts  # session refresh + route protection
```

---

## 📏 Key business rules (PRD §12)

| Module | Rule |
|---|---|
| MEAL | B + L + D each = 1.0 unit; own columns only; totals read-only; future dates locked |
| BAZAR | Duty = days ÷ members (auto, admin can override); only assigned shopper enters amount; Meal Rate = Total Bazar ÷ Total Meals |
| BILL | Meal cost = meals × rate; fixed costs split equally; custom split = admin's choice; locked month = no edits |
| USERS | New member auto-added to current month; schedule recalculates on add/remove |
| SECURITY | RLS at DB level + frontend checks |

---

## 🇧🇩 সংক্ষেপে (বাংলায়)

1. Supabase-এ প্রজেক্ট খুলে `supabase/migrations/0001_init.sql` তারপর `supabase/seed.sql` চালান।
2. Google OAuth চালু করুন, `.env.local`-এ ৪টি ভ্যালু বসান।
3. `npm install && npm run dev` — প্রত্যেক মেম্বার নিজের Gmail দিয়ে **Continue with Google** চাপলেই অ্যাকাউন্ট তৈরি হয়ে যাবে (আবুল হায়াত = সুপার অ্যাডমিন)।
4. প্রতিদিনের মিল `/meal`-এ, বাজার `/bazar`-এ, মাস শেষে `/bill` থেকে PDF নামান। 🎉
