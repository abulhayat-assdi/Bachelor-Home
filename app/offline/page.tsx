import { Logo } from "@/components/shared/Logo";

export const metadata = { title: "Offline — Bachelor Home" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <Logo size="lg" />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-muted">
        Bachelor Home needs an internet connection to load your meals, bazar and
        bills. Check your connection and try again.
      </p>
    </div>
  );
}
