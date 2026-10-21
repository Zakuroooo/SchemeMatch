import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Screening } from "@/components/Screening";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-300 pb-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-slate-700">{t("tagline")}</p>
        </div>
        <LanguageSwitcher />
      </header>
      <p
        role="note"
        className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
      >
        {t("testing")}
      </p>
      <Screening />
    </main>
  );
}
