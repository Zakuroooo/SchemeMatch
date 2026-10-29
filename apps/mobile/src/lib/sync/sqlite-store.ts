import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type { QueuedScreening, Status } from "./queue";
import type { QueueStore, SettingName } from "./store";

interface Row {
  key: string;
  install_id: string;
  profile: string;
  created_at: number;
  status: Status;
  attempts: number;
  next_try_at: number;
}

// secure_delete: deleted rows are overwritten with zeros, so "Delete my data" leaves no copy
// in the file's free space.
const SCHEMA = `
  PRAGMA secure_delete = ON;
  CREATE TABLE IF NOT EXISTS queue (
    key TEXT PRIMARY KEY NOT NULL,
    install_id TEXT NOT NULL,
    profile TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    next_try_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
`;

/** The queue in a SQLite file inside the app's private storage. Opened on first use. */
export function sqliteStore(file = "schemematch.db"): QueueStore {
  let opening: Promise<SQLiteDatabase> | null = null;
  const db = () =>
    (opening ??= openDatabaseAsync(file).then(async (d) => {
      await d.execAsync(SCHEMA);
      return d;
    }));
  return {
    all: async () =>
      (await (await db()).getAllAsync<Row>("SELECT * FROM queue ORDER BY created_at")).map(
        (r): QueuedScreening => ({
          key: r.key,
          installId: r.install_id,
          profile: JSON.parse(r.profile) as QueuedScreening["profile"],
          createdAt: r.created_at,
          status: r.status,
          attempts: r.attempts,
          nextTryAt: r.next_try_at,
        }),
      ),
    put: async (r) => {
      await (
        await db()
      ).runAsync(
        "INSERT OR REPLACE INTO queue (key, install_id, profile, created_at, status, attempts, next_try_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        r.key,
        r.installId,
        JSON.stringify(r.profile),
        r.createdAt,
        r.status,
        r.attempts,
        r.nextTryAt,
      );
    },
    remove: async (key) => {
      await (await db()).runAsync("DELETE FROM queue WHERE key = ?", key);
    },
    clear: async () => {
      await (await db()).runAsync("DELETE FROM queue");
    },
    getSetting: async (name: SettingName) =>
      (
        await (
          await db()
        ).getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE name = ?", name)
      )?.value ?? null,
    setSetting: async (name, value) => {
      const d = await db();
      if (value === null) await d.runAsync("DELETE FROM settings WHERE name = ?", name);
      else
        await d.runAsync(
          "INSERT OR REPLACE INTO settings (name, value) VALUES (?, ?)",
          name,
          value,
        );
    },
  };
}
