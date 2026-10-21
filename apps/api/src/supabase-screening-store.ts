import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  IdempotencyKeyReusedError,
  type SaveRequest,
  type SavedScreening,
  type ScreeningStore,
} from "./screening-store.js";

export interface SupabaseScreeningStoreOptions {
  url: string;
  /**
   * Server-only secret key (Supabase "secret key", or the legacy service_role key).
   * The screenings tables are closed to the public keys, so only this key can save.
   * It must never reach a client app or a log line.
   */
  secretKey: string;
}

/** Saves through the save_screening / delete_install_screenings functions (migration 3). */
export class SupabaseScreeningStore implements ScreeningStore {
  private readonly db: SupabaseClient;

  constructor({ url, secretKey }: SupabaseScreeningStoreOptions) {
    this.db = createClient(url, secretKey, { auth: { persistSession: false } });
  }

  async save(req: SaveRequest): Promise<SavedScreening> {
    const { data, error } = await this.db.rpc("save_screening", {
      p_key: req.idempotencyKey,
      p_request_hash: req.requestHash,
      p_install_id: req.installId,
      p_channel: req.channel,
      p_profile: req.profile,
      p_matches: req.matches,
    });
    if (error) {
      if (error.message.includes("idempotency_key_reused")) throw new IdempotencyKeyReusedError();
      throw new Error(`could not save screening: ${error.message}`);
    }
    return data as SavedScreening;
  }

  async deleteInstall(installId: string): Promise<number> {
    const { data, error } = await this.db.rpc("delete_install_screenings", {
      p_install_id: installId,
    });
    if (error) throw new Error(`could not delete screenings: ${error.message}`);
    return data as number;
  }
}
