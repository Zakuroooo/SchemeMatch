import { createContext, useContext, useEffect, type ReactNode } from "react";
import { AppState } from "react-native";
import type { Sync } from "@/lib/sync/sync";

const SyncContext = createContext<Sync | null>(null);

/**
 * Sends saved screenings in the background: when the app starts, whenever it comes back to the
 * front, and on the retry timer. Nothing here ever waits on the network before showing a screen.
 */
export function SyncProvider({ children, sync }: { children: ReactNode; sync: Sync }) {
  useEffect(() => {
    void sync.sync();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync.sync();
    });
    return () => {
      sub.remove();
      sync.stop();
    };
  }, [sync]);
  return <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>;
}

export function useSync(): Sync {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync needs a SyncProvider");
  return ctx;
}
