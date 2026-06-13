import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;

// One shared browser client for the whole tab — avoids spinning up a fresh
// client (and duplicate auth / realtime connections) on every call.
let browserClient: BrowserClient | undefined;

export function createClient(): BrowserClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key"
    );
  }
  return browserClient;
}
