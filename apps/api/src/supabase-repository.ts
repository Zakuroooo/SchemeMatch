import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RuleNode, UnmodelledCriterion } from "@schemematch/engine";
import type { CatalogScheme, SchemeRepository } from "./repository.js";

interface Row {
  slug: string;
  level: "central" | "state";
  state: string | null;
  category: string;
  official_url: string;
  texts: { lang: string; title: string; benefit: string; how_to_apply: string }[];
  rules: {
    rule_format_version: number;
    eligibility: RuleNode;
    unmodelled: UnmodelledCriterion[];
  } | null;
}

// One query: each scheme with its English text and its CURRENT rule version.
// RLS (anon key) already limits this to live schemes, so drafts can never leak.
const SELECT = `slug, level, state, category, official_url,
  texts:scheme_texts(lang, title, benefit, how_to_apply),
  rules:scheme_rule_versions!schemes_current_rule_version_fk(rule_format_version, eligibility, unmodelled)`;

export interface SupabaseRepoOptions {
  url: string;
  /** Publishable / anon key only. Never the service-role key. */
  anonKey: string;
  cacheMs?: number;
  now?: () => number;
}

export class SupabaseSchemeRepository implements SchemeRepository {
  private readonly db: SupabaseClient;
  private readonly cacheMs: number;
  private readonly now: () => number;
  private cache: { at: number; schemes: CatalogScheme[] } | null = null;

  constructor({ url, anonKey, cacheMs = 60_000, now = Date.now }: SupabaseRepoOptions) {
    this.db = createClient(url, anonKey, { auth: { persistSession: false } });
    this.cacheMs = cacheMs;
    this.now = now;
  }

  async listLive({ fresh = false }: { fresh?: boolean } = {}): Promise<CatalogScheme[]> {
    if (!fresh && this.cache && this.now() - this.cache.at < this.cacheMs) {
      return this.cache.schemes;
    }
    const { data, error } = await this.db.from("schemes").select(SELECT).order("slug");
    if (error) throw new Error(`could not load schemes: ${error.message}`);
    const schemes = (data as unknown as Row[])
      .filter((r) => r.rules !== null) // a live scheme without rules is not served
      .map(toCatalogScheme);
    this.cache = { at: this.now(), schemes };
    return schemes;
  }
}

function toCatalogScheme(r: Row): CatalogScheme {
  const en = r.texts.find((t) => t.lang === "en");
  if (!en) throw new Error(`${r.slug}: missing English text`);
  return {
    slug: r.slug,
    level: r.level,
    state: r.state,
    category: r.category,
    official_url: r.official_url,
    rule_format_version: r.rules!.rule_format_version,
    eligibility: r.rules!.eligibility,
    unmodelled: r.rules!.unmodelled,
    text: { en: { title: en.title, benefit: en.benefit, how_to_apply: en.how_to_apply } },
  };
}
