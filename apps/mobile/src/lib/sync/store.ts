import type { QueuedScreening } from "./queue";

/** Where the queue and two small settings live. SQLite on the phone; memory in tests. */
export interface QueueStore {
  all(): Promise<QueuedScreening[]>;
  /** Insert, or replace the row with the same key. */
  put(row: QueuedScreening): Promise<void>;
  remove(key: string): Promise<void>;
  /** Empty the queue (delete my data). Settings stay. */
  clear(): Promise<void>;
  getSetting(name: SettingName): Promise<string | null>;
  /** null removes the setting. */
  setSetting(name: SettingName, value: string | null): Promise<void>;
}

/**
 * install_id: this phone's random ID. pending_deletes: JSON list of old install IDs whose
 * server copies still need deleting (the phone was offline when "Delete my data" was tapped).
 */
export type SettingName = "install_id" | "pending_deletes";

export function memoryStore(): QueueStore {
  const rows = new Map<string, QueuedScreening>();
  const settings = new Map<SettingName, string>();
  return {
    all: async () => [...rows.values()].map((r) => ({ ...r })),
    put: async (row) => void rows.set(row.key, { ...row }),
    remove: async (key) => void rows.delete(key),
    clear: async () => rows.clear(),
    getSetting: async (name) => settings.get(name) ?? null,
    setSetting: async (name, value) =>
      void (value === null ? settings.delete(name) : settings.set(name, value)),
  };
}
