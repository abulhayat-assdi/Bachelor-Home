import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Providers } from "@/components/shared/Providers";
import { InstallPrompt } from "@/components/shared/InstallPrompt";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <Providers>
      <div className="min-h-dvh bg-bg">
        <TopBar />
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">{children}</main>
        <InstallPrompt />
        <BottomNav />
      </div>
    </Providers>
  );
}
