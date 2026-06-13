import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const full_name = (body?.full_name ?? "").trim();
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";
  if (!full_name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { error: "Valid full name and email required" },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // next display order
  const { data: maxRow } = await admin
    .from("member_directory")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_index = (maxRow?.order_index ?? 0) + 1;

  const { error: dirErr } = await admin.from("member_directory").upsert(
    { email, full_name, role: "member", order_index },
    { onConflict: "email" }
  );
  if (dirErr) {
    return NextResponse.json({ error: dirErr.message }, { status: 500 });
  }

  // creates the auth user with the admin-set password (email pre-confirmed so
  // the member can log in immediately); profile row is created by trigger.
  // must_change_password prompts the member to set their own password on first
  // visit to /profile. They can change name/password/etc. themselves any time.
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, must_change_password: true },
  });
  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 500 });
  }

  // member joins all current-month columns + duty schedule recalculated
  const now = new Date();
  const { data: monthId } = await admin.rpc("ensure_month", {
    p_year: now.getFullYear(),
    p_month: now.getMonth() + 1,
  });
  if (monthId) {
    await admin.rpc("regenerate_duty_schedule", { p_month_id: monthId });
  }

  return NextResponse.json({ ok: true });
}
