"use client";

import { useEffect, useState } from "react";
import { Download, Share, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "bh-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires beforeinstallprompt — show a manual hint instead.
    if (isIos()) {
      setShowIosHint(true);
      setHidden(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 px-4">
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border-c bg-surface p-3 shadow-card">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00C896] text-white">
          <Download className="h-5 w-5" />
        </div>

        {showIosHint ? (
          <p className="flex-1 text-xs leading-snug text-text">
            Install: tap{" "}
            <Share className="inline h-3.5 w-3.5 -translate-y-px" /> then{" "}
            <span className="font-semibold">
              Add to Home Screen <Plus className="inline h-3 w-3" />
            </span>
          </p>
        ) : (
          <div className="flex flex-1 items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text">Install the app</p>
            <Button size="sm" onClick={install}>
              Install
            </Button>
          </div>
        )}

        <button
          aria-label="Dismiss"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-muted hover:bg-bg hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
