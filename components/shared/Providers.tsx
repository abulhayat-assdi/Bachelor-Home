"use client";

import { SWRConfig } from "swr";

/**
 * App-wide client data cache. Every data hook reads/writes the same SWR cache,
 * so navigating between pages serves cached data instantly and only revalidates
 * in the background (stale-while-revalidate). Future features get this for free
 * just by using `useSWR`.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false, // don't refetch every time the tab regains focus
        dedupingInterval: 5000, // collapse duplicate calls for the same key
        keepPreviousData: true, // keep showing old data while switching months
      }}
    >
      {children}
    </SWRConfig>
  );
}
