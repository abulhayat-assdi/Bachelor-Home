import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Delegate to the SQL RPC which atomically checks the last-admin guard,
  // updates the role, and sends the notification — eliminating the TOCTOU
  // race between the count check and the UPDATE that the old TS code had.
  const { error } = await supabase.rpc("set_member_role", {
    p_user: target_id,
    p_role: role,
  });

  if (error) {
    const status = error.message.includes("At least one admin") ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
