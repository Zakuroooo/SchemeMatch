import { getLocales } from "expo-localization";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import bn from "./bn.json";
import en from "./en.json";

export const LANGUAGES = ["en", "bn"] as const;
export type Lang = (typeof LANGUAGES)[number];

const MESSAGES: Record<Lang, unknown> = { en, bn };

type Params = Record<string, string | number>;

/**
 * Look up "a.b.c" in the messages and fill {name} placeholders.
 * With params.count === 1, a "<key>_one" message is used when it exists.
 * A missing key returns the key itself, so a gap is visible (and a test checks there are none).
 */
export function translate(lang: Lang, key: string, params: Params = {}): string {
  const get = (path: string) =>
    path
      .split(".")
      .reduce<unknown>(
        (node, k) =>
          node && typeof node === "object" ? (node as Record<string, unknown>)[k] : undefined,
        MESSAGES[lang],
      );
  const text = (params.count === 1 && get(`${key}_one`)) || get(key);
  if (typeof text !== "string") return key;
  return text.replace(/\{(\w+)\}/g, (all, name: string) =>
    params[name] === undefined ? all : String(params[name]),
  );
}

/** The phone's language if we have it, else English. */
export function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode;
  return code === "bn" ? "bn" : "en";
}

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Params) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLang] = useState<Lang>(initial ?? deviceLang);
  const value = useMemo(
    () => ({ lang, setLang, t: (key: string, params?: Params) => translate(lang, key, params) }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n needs an I18nProvider");
  return ctx;
}
