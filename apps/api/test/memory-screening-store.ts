import {
  IdempotencyKeyReusedError,
  type SaveRequest,
  type SavedScreening,
  type ScreeningStore,
} from "../src/screening-store.js";

/**
 * Test double with the same rules as the database function (supabase/migrations, migration 3):
 * one screening per key, a retry gets the stored result, a reused key with another request fails.
 * The real thing is tested against Postgres in supabase-screenings.integration.test.ts.
 */
export class MemoryScreeningStore implements ScreeningStore {
  readonly rows = new Map<string, { hash: string; installId: string; saved: SavedScreening }>();
  private next = 1;

  async save(req: SaveRequest): Promise<SavedScreening> {
    const existing = this.rows.get(req.idempotencyKey);
    if (existing) {
      if (existing.hash !== req.requestHash) throw new IdempotencyKeyReusedError();
      return { ...existing.saved, created: false };
    }
    const saved = {
      screening_id: `00000000-0000-4000-8000-${String(this.next++).padStart(12, "0")}`,
      created: true,
      results: [...req.matches].sort((a, b) => a.slug.localeCompare(b.slug)),
    };
    this.rows.set(req.idempotencyKey, { hash: req.requestHash, installId: req.installId, saved });
    return saved;
  }

  async deleteInstall(installId: string): Promise<number> {
    let n = 0;
    for (const [key, row] of this.rows) {
      if (row.installId === installId) {
        this.rows.delete(key);
        n++;
      }
    }
    return n;
  }
}
