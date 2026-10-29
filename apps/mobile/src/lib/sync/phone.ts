import { randomUUID } from "expo-crypto";
import { API_URL } from "@/lib/config";
import { sqliteStore } from "./sqlite-store";
import { createSync, type Sync } from "./sync";

/** The real thing: SQLite on the phone, the real network, expo-crypto's random UUIDs. */
export function phoneSync(): Sync {
  return createSync({
    store: sqliteStore(),
    fetch: (...args) => fetch(...args),
    apiUrl: API_URL,
    uuid: randomUUID,
    // Status lines only (never answers or IDs), and only in development builds.
    log: (message) => {
      if (__DEV__) console.info(message);
    },
  });
}
