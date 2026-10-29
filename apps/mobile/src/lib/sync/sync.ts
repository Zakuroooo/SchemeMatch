import type { Profile } from "@schemematch/engine";
import { afterFailure, due, newScreening, nextWake, outcomeOf } from "./queue";
import type { QueueStore } from "./store";

export interface SyncDeps {
  store: QueueStore;
  fetch: typeof fetch;
  /** API base URL, no trailing slash. */
  apiUrl: string;
  /** Random UUID maker (expo-crypto on the phone). */
  uuid: () => string;
  now?: () => number;
  /** Gets short status lines only: never answers, never the install ID. */
  log?: (message: string) => void;
  /** Give up on one request after this long and treat it as a network error. */
  timeoutMs?: number;
}

export interface SyncReport {
  sent: number;
  dropped: number;
  /** Still in the queue afterwards (waiting for a retry). */
  waiting: number;
}

export interface DeleteReport {
  /** Screenings removed from this phone's queue. */
  local: number;
  /**
   * deleted: the server confirmed. pending: it couldn't be reached (or isn't ready), so the
   * delete is kept and retried on every sync. none: this phone never had an install ID, so it
   * never sent anything.
   */
  server: "deleted" | "pending" | "none";
}

export interface Sync {
  /** Save locally (fast, works offline), then try to send in the background. Returns the key. */
  save(profile: Profile): Promise<string>;
  /** Send what is due. Never throws; null if the phone's storage failed. */
  sync(): Promise<SyncReport | null>;
  deleteMyData(): Promise<DeleteReport>;
  /** Stop the retry timer (app shutdown, tests). */
  stop(): void;
}

/** Runs tasks one at a time, in order. A failed task doesn't block the next. */
function serial() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}

const parseIds = (json: string | null): string[] => (json ? (JSON.parse(json) as string[]) : []);

export function createSync({
  store,
  fetch,
  apiUrl,
  uuid,
  now = Date.now,
  log = () => undefined,
  timeoutMs = 15_000,
}: SyncDeps): Sync {
  // Network work runs one batch at a time; quick local writes have their own lane, so saving
  // never waits behind a slow request.
  const network = serial();
  const local = serial();
  // Bumped by "Delete my data" (in the local lane). A send that was already in flight must
  // then not write its row back into the queue that was just emptied.
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function request(
    method: "POST" | "DELETE",
    headers: Record<string, string>,
    body?: string,
  ): Promise<number | "network"> {
    const abort = new AbortController();
    const t = setTimeout(() => abort.abort(), timeoutMs);
    try {
      // Answers go in the body only, never the URL (URLs end up in logs).
      const res = await fetch(`${apiUrl}/screenings`, {
        method,
        headers,
        body,
        signal: abort.signal,
      });
      return res.status;
    } catch {
      return "network";
    } finally {
      clearTimeout(t);
    }
  }

  async function installId(): Promise<string> {
    const saved = await store.getSetting("install_id");
    if (saved) return saved;
    const id = uuid();
    await store.setSetting("install_id", id);
    return id;
  }

  /** Retry server deletes that couldn't finish before. Returns how many are still pending. */
  async function sendPendingDeletes(): Promise<number> {
    const done: string[] = [];
    for (const id of parseIds(await store.getSetting("pending_deletes"))) {
      if ((await request("DELETE", { "x-install-id": id })) === 200) done.push(id);
    }
    // Re-read: "Delete my data" may have added an ID while we were waiting on the network.
    return local(async () => {
      const left = parseIds(await store.getSetting("pending_deletes")).filter(
        (id) => !done.includes(id),
      );
      await store.setSetting("pending_deletes", left.length ? JSON.stringify(left) : null);
      return left.length;
    });
  }

  function schedule(wake: number | null) {
    if (timer) clearTimeout(timer);
    timer = null;
    if (wake === null) return;
    timer = setTimeout(
      () => {
        timer = null;
        void sync();
      },
      Math.max(wake - now(), 1_000),
    );
  }

  async function syncNow(): Promise<SyncReport> {
    await sendPendingDeletes();
    // Read and write the queue in the local lane, so "Delete my data" lands either fully
    // before or fully after each step, never in the middle.
    const { gen, rows } = await local(async () => ({ gen: generation, rows: await store.all() }));
    const report: SyncReport = { sent: 0, dropped: 0, waiting: 0 };
    for (const row of due(rows, now())) {
      const status = await request(
        "POST",
        { "content-type": "application/json", "idempotency-key": row.key },
        JSON.stringify({ install_id: row.installId, profile: row.profile }),
      );
      const outcome = outcomeOf(status);
      const deleted = await local(async () => {
        // "Delete my data" ran while this was in flight: the row is gone, don't bring it back.
        if (gen !== generation) return true;
        if (outcome === "retry") await store.put(afterFailure(row, now()));
        else await store.remove(row.key);
        return false;
      });
      if (deleted) break;
      if (outcome === "sent") report.sent++;
      if (outcome === "drop") {
        report.dropped++;
        log(`sync: dropped a screening, the server answered ${status}`);
      }
    }
    const left = await store.all();
    report.waiting = left.length;
    schedule(nextWake(left));
    return report;
  }

  function sync(): Promise<SyncReport | null> {
    return network(syncNow).catch(() => {
      log("sync: the phone's storage failed");
      return null;
    });
  }

  return {
    async save(profile) {
      const row = await local(async () => {
        const r = newScreening(await installId(), profile, now(), uuid());
        await store.put(r);
        return r;
      });
      void sync();
      return row.key;
    },

    sync,

    async deleteMyData() {
      const { removed, pending } = await local(async () => {
        generation++;
        const removed = (await store.all()).length;
        await store.clear();
        const ids = parseIds(await store.getSetting("pending_deletes"));
        const id = await store.getSetting("install_id");
        if (id) {
          // A fresh ID from now on: later saves can't be linked to what was deleted.
          await store.setSetting("install_id", null);
          ids.push(id);
          await store.setSetting("pending_deletes", JSON.stringify(ids));
        }
        return { removed, pending: ids.length };
      });
      schedule(null);
      if (pending === 0) return { local: removed, server: "none" };
      const left = await network(sendPendingDeletes).catch(() => 1);
      return { local: removed, server: left === 0 ? "deleted" : "pending" };
    },

    stop: () => schedule(null),
  };
}
