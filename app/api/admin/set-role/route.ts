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

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const target_id: string = body?.user_id ?? "";
  const role: string = body?.role ?? "";

  if (!target_id || !["admin", "member"].includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Guard: cannot demote the last active admin.
  if (role === "member") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_active", true);
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", target_id)
      .single();
    if ((count ?? 0) <= 1 && targetProfile?.role === "admin") {
      return NextResponse.json(
        { error: "At least one admin must remain" },
        { status: 400 }
      );
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", target_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify the affected member.
  const msg =
    role === "admin"
      ? "You are now an admin of Bachelor Home."
      : "Your admin access has been removed.";
  await admin
    .from("notifications")
    .insert({ recipient_id: target_id, type: "role_changed", message: msg });

  return NextResponse.json({ ok: true });
}
