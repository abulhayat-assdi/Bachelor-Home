"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, KeyRound, Loader2, LogOut, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProfiles } from "@/hooks/useProfiles";
import { useAppStore } from "@/store/useAppStore";
import { useMonthData } from "@/hooks/useMonthData";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { memberColor } from "@/lib/constants";
import {
  formatMeals,
  formatMoney,
  monthLabel,
  shortDate,
  weekdayName,
} from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { me, loading, refetch } = useProfiles();
  const { year, month } = useAppStore();
  const { meals, bazar } = useMonthData(year, month);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [password, setPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mustChangePw, setMustChangePw] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await createClient().auth.getUser();
      if (data.user?.user_metadata?.must_change_password) {
        setMustChangePw(true);
      }
    })();
  }, []);

  if (loading || !me) {
    return <Skeleton className="h-64" />;
  }

  const myMeals = meals
    .filter((m) => m.user_id === me.id)
    .reduce(
      (s, m) => s + Number(m.breakfast) + Number(m.lunch) + Number(m.dinner),
      0
    );
  const myBazarEntries = bazar
    .filter((b) => b.shopper_id === me.id)
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  const myBazar = myBazarEntries.reduce((s, b) => s + Number(b.amount), 0);

  async function saveName() {
    if (!me || name == null || !name.trim()) return;
    setSavingName(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", me.id);
    setSavingName(false);
    setMsg(
      error
        ? { ok: false, text: error.message }
        : { ok: true, text: "Name updated" }
    );
    refetch();
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    setUploading(true);
    setMsg(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${me.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (upErr) {
      setMsg({ ok: false, text: upErr.message });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", me.id);
    setUploading(false);
    setMsg({ ok: true, text: "Photo updated" });
    refetch();
  }

  async function changePassword() {
    if (password.length < 6) {
      setMsg({ ok: false, text: "Password must be at least 6 characters" });
      return;
    }
    setSavingPw(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setSavingPw(false);
    if (!error) setMustChangePw(false);
    setMsg(
      error
        ? { ok: false, text: error.message }
        : { ok: true, text: "Password changed" }
    );
    setPassword("");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold">My Profile</h1>

      {mustChangePw && (
        <div className="rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
          Your account was created by an admin. Please set your own password
          below before you start using the app.
        </div>
      )}

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative"
            aria-label="Change photo"
          >
            <Avatar
              name={me.full_name}
              src={me.avatar_url}
              color={memberColor(me.order_index)}
              size={64}
            />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow">
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={uploadAvatar}
          />
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold">{me.full_name}</div>
            <div className="truncate text-xs text-muted">{me.email}</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase text-primary">
              {me.role === "admin" ? "Super Admin" : "Member"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This month summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-[10px] font-semibold uppercase text-muted">
              My meals — {monthLabel(year, month)}
            </div>
            <div className="mt-1 text-2xl font-extrabold text-secondary">
              {formatMeals(myMeals)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-[10px] font-semibold uppercase text-muted">
              My bazar spent
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {formatMoney(myBazar)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My bazar — date-wise (what I bought, how much, items) */}
      <Card>
        <CardContent className="p-3">
          <div className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-muted">
            My bazar — {monthLabel(year, month)}
          </div>
          {myBazarEntries.length === 0 ? (
            <p className="px-1 pb-1 text-xs text-muted">
              No bazar done this month.
            </p>
          ) : (
            <div className="flex flex-col">
              {myBazarEntries.map((b) => (
                <div
                  key={b.id}
                  className="flex items-start gap-3 rounded-xl px-1.5 py-2"
                >
                  <div className="w-14 shrink-0">
                    <div className="text-sm font-extrabold">
                      {shortDate(b.expense_date)}
                    </div>
                    <div className="text-[10px] text-muted">
                      {weekdayName(b.expense_date).slice(0, 3)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">
                      {formatMoney(Number(b.amount))}
                    </div>
                    {b.comment && (
                      <div className="text-xs text-muted">{b.comment}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {msg && (
        <p
          className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${
            msg.ok ? "bg-secondary/10 text-secondary" : "bg-accent/10 text-accent"
          }`}
        >
          {msg.text}
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <Label htmlFor="p-name">Full name</Label>
          <div className="flex gap-2">
            <Input
              id="p-name"
              value={name ?? me.full_name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={saveName} disabled={savingName} size="icon">
              {savingName ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <Label htmlFor="p-pass">Change password</Label>
          <div className="flex gap-2">
            <Input
              id="p-pass"
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              onClick={changePassword}
              disabled={savingPw}
              size="icon"
              variant="secondary"
            >
              {savingPw ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={signOut}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
