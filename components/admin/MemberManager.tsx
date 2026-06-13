"use client";

import { useRef, useState } from "react";
import {
  Camera,
  Loader2,
  Shield,
  ShieldOff,
  UserMinus,
  UserPlus,
  UserCheck,
} from "lucide-react";
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
  meId,
  monthId,
  onChanged,
}: {
  profiles: Profile[];
  meId: string;
  monthId: string | null;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoTargetId = useRef<string | null>(null);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMsg({
        ok: true,
        text: `${name} can now log in with ${email}. Schedule updated.`,
      });
      setName("");
      setEmail("");
      setPassword("");
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

  function pickPhoto(userId: string) {
    photoTargetId.current = userId;
    fileRef.current?.click();
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const userId = photoTargetId.current;
    e.target.value = "";
    if (!file || !userId) return;
    setUploadingId(userId);
    setMsg(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (upErr) {
      setMsg({ ok: false, text: upErr.message });
      setUploadingId(null);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", userId);
    setUploadingId(null);
    setMsg(
      updErr
        ? { ok: false, text: updErr.message }
        : { ok: true, text: "Photo updated" }
    );
    onChanged();
  }

  async function toggleRole(p: Profile) {
    const nextRole = p.role === "admin" ? "member" : "admin";
    setRoleId(p.id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: p.id, role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMsg({
        ok: true,
        text:
          nextRole === "admin"
            ? `${p.full_name} is now an admin`
            : `${p.full_name} is no longer an admin`,
      });
      onChanged();
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setRoleId(null);
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-password">Password</Label>
              <Input
                id="m-password"
                type="text"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-[11px] text-muted">
                Share this with the member. They can change it later from their
                profile.
              </p>
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
              Create member
            </Button>
          </form>
        </CardContent>
      </Card>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={uploadPhoto}
      />

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
              <button
                type="button"
                onClick={() => pickPhoto(p.id)}
                disabled={uploadingId === p.id}
                className="relative shrink-0"
                aria-label={`Change ${p.full_name}'s photo`}
              >
                <Avatar
                  name={p.full_name}
                  src={p.avatar_url}
                  color={memberColor(p.order_index)}
                  size={36}
                />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white shadow">
                  {uploadingId === p.id ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <Camera className="h-2.5 w-2.5" />
                  )}
                </span>
              </button>
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
              {p.id !== meId && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant={p.role === "admin" ? "outline" : "secondary"}
                    disabled={roleId === p.id}
                    onClick={() => toggleRole(p)}
                  >
                    {roleId === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : p.role === "admin" ? (
                      <>
                        <ShieldOff className="h-3.5 w-3.5" /> Remove admin
                      </>
                    ) : (
                      <>
                        <Shield className="h-3.5 w-3.5" /> Make admin
                      </>
                    )}
                  </Button>
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
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
