"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations();
  const current = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={t("app.language")} className="flex gap-1 text-sm">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          lang={locale}
          aria-current={locale === current ? "true" : undefined}
          className={`inline-flex min-h-11 items-center rounded px-3 ${
            locale === current
              ? "bg-slate-900 text-white"
              : "text-slate-700 underline-offset-2 hover:underline"
          }`}
        >
          {t(`languages.${locale}`)}
        </Link>
      ))}
    </nav>
  );
}
