"use client";

import { useEffect } from "react";

// Registers the service worker once on the client. Kept separate from the
// install UI so the SW still registers even if the prompt is dismissed.
export function PwaProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
