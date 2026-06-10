"use client";

import { useState } from "react";
import { Loader2, UserMinus, UserPlus, UserCheck } from "lucide-react";
import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { memberColor } from "@/lib/constants";

export function MemberManager({
  profiles,
  monthId,
  onChanged,
}: {
  profiles: Profile[];
  monthId: string | null;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMsg({ ok: true, text: `Invite sent to ${email}. Schedule updated.` });
      setName("");
      setEmail("");
      onChanged();
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: Profile) {
    setTogglingId(p.id);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (monthId) {
      await supabase.rpc("admin_regenerate_schedule", { p_month_id: monthId });
    }
    setTogglingId(null);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
            Add Member
          </div>
          <form onSubmit={addMember} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-name">Full name</Label>
              <Input
                id="m-name"
                required
                placeholder="e.g. Rahim Uddin"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-email">Email</Label>
              <Input
                id="m-email"
                type="email"
                required
                placeholder="rahim@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {msg && (
              <p
                className={`rounded-lg px-3 py-2 text-xs font-medium ${
                  msg.ok
                    ? "bg-secondary/10 text-secondary"
                    : "bg-accent/10 text-accent"
                }`}
              >
                {msg.text}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Send invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2">
          <div className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">
            Members ({profiles.length})
          </div>
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5"
            >
              <Avatar
                name={p.full_name}
                src={p.avatar_url}
                color={memberColor(p.order_index)}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-sm font-semibold">
                  {p.full_name}
                  {p.role === "admin" && (
                    <Badge className="bg-primary/15 text-primary">Admin</Badge>
                  )}
                  {!p.is_active && (
                    <Badge className="bg-muted/20 text-muted">Inactive</Badge>
                  )}
                </div>
                <div className="truncate text-xs text-muted">{p.email}</div>
              </div>
              {p.role !== "admin" && (
                <Button
                  size="sm"
                  variant={p.is_active ? "outline" : "secondary"}
                  disabled={togglingId === p.id}
                  onClick={() => toggleActive(p)}
                >
                  {togglingId === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : p.is_active ? (
                    <>
                      <UserMinus className="h-3.5 w-3.5" /> Remove
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5" /> Restore
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
