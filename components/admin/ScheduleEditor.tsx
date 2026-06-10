"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { DutyDay, Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { shortDate, weekdayName } from "@/lib/utils";

export function ScheduleEditor({
  duty,
  profiles,
  monthId,
  onChanged,
}: {
  duty: DutyDay[];
  profiles: Profile[];
  monthId: string | null;
  onChanged: () => void;
}) {
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const active = profiles.filter((p) => p.is_active);

  async function reassign(date: string, userId: string) {
    if (!monthId) return;
    setSavingDate(date);
    const supabase = createClient();
    await supabase.rpc("reassign_duty", {
      p_month_id: monthId,
      p_date: date,
      p_user: userId,
    });
    setSavingDate(null);
    onChanged();
  }

  async function regenerate() {
    if (!monthId) return;
    setRegenerating(true);
    const supabase = createClient();
    await supabase.rpc("admin_regenerate_schedule", { p_month_id: monthId });
    setRegenerating(false);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="outline" onClick={regenerate} disabled={regenerating}>
        {regenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Auto-redistribute whole month
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-2 p-3">
          {[...duty]
            .sort((a, b) => a.duty_date.localeCompare(b.duty_date))
            .map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="w-16 shrink-0">
                  <div className="text-xs font-bold">
                    {shortDate(d.duty_date)}
                  </div>
                  <div className="text-[10px] text-muted">
                    {weekdayName(d.duty_date).slice(0, 3)}
                  </div>
                </div>
                <Select
                  value={d.user_id}
                  disabled={savingDate === d.duty_date}
                  onChange={(e) => reassign(d.duty_date, e.target.value)}
                  className="h-9 flex-1 text-xs"
                >
                  {active.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
