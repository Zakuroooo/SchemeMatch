"use client";

import type { Field } from "@schemematch/engine";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { checkEligibility, type CheckError, type EligibilityResponse } from "@/lib/api";
import { GROUPS, INPUTS, toProfile, type FormValues } from "@/lib/profile";

const noSubscribe = () => () => {};

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; data: EligibilityResponse }
  | { kind: "error"; error: CheckError };

export function Screening({ fetcher }: { fetcher?: typeof fetch }) {
  const t = useTranslations();
  const [values, setValues] = useState<FormValues>({});
  const [invalid, setInvalid] = useState<Field[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Until React has taken over the page, a click would make the browser submit the form
  // itself. The button stays disabled until then (see the privacy note on the form).
  const ready = useSyncExternalStore(
    noSubscribe,
    () => true, // in the browser, once hydrated
    () => false, // in the server-rendered HTML
  );
  const label = (f: Field) => t(`form.fields.${f}`);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { profile, invalid: bad } = toProfile(values);
    setInvalid(bad);
    if (bad.length > 0) return;
    setStatus({ kind: "loading" });
    const result = await checkEligibility(profile, fetcher);
    setStatus(
      result.ok ? { kind: "done", data: result.data } : { kind: "error", error: result.error },
    );
  }

  function clear() {
    setValues({});
    setInvalid([]);
    setStatus({ kind: "idle" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/*
        Privacy: answers must never end up in a URL (history, logs, analytics). So the inputs
        have no `name` (a native submit has nothing to send), the method is POST (never a
        query string), and the button is disabled until React handles the submit itself.
      */}
      <form
        method="post"
        onSubmit={onSubmit}
        noValidate
        className="space-y-4"
        aria-describedby="form-intro"
      >
        <h2 className="text-lg font-semibold">{t("form.title")}</h2>
        <p id="form-intro" className="text-sm text-slate-700">
          {t("form.intro")}
        </p>
        {GROUPS.map((group) => (
          <fieldset key={group.id} className="rounded-lg border border-slate-300 bg-white p-4">
            <legend className="px-1 text-sm font-semibold">{t(`form.groups.${group.id}`)}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.fields.map((field) => (
                <FieldControl
                  key={field}
                  field={field}
                  label={label(field)}
                  value={values[field] ?? ""}
                  invalid={invalid.includes(field)}
                  onChange={(v) => setValues((old) => ({ ...old, [field]: v }))}
                />
              ))}
            </div>
          </fieldset>
        ))}
        {invalid.length > 0 && (
          <p role="alert" className="text-sm font-medium text-red-800">
            {t("form.invalid", { fields: invalid.map(label).join(", ") })}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!ready || status.kind === "loading"}
            className="min-h-11 rounded bg-slate-900 px-4 py-2 font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:opacity-60"
          >
            {status.kind === "loading" ? t("form.checking") : t("form.submit")}
          </button>
          <button
            type="button"
            onClick={clear}
            className="min-h-11 rounded border border-slate-400 px-4 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            {t("form.clear")}
          </button>
        </div>
      </form>
      <section aria-labelledby="results-title" aria-live="polite" className="space-y-4">
        <h2 id="results-title" className="text-lg font-semibold">
          {t("results.title")}
        </h2>
        <Results status={status} fieldLabel={label} />
      </section>
    </div>
  );
}

function FieldControl({
  field,
  label: text,
  value,
  invalid: bad,
  onChange,
}: {
  field: Field;
  label: string;
  value: string;
  invalid: boolean;
  onChange: (v: string) => void;
}) {
  const t = useTranslations();
  const input = INPUTS[field];
  const id = `f-${field}`;
  const common = {
    id,
    value,
    "aria-invalid": bad || undefined,
    className: `min-h-11 w-full rounded border px-2 ${bad ? "border-red-700" : "border-slate-400"} focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600`,
  };
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span>{text}</span>
      {input.kind === "int" || input.kind === "number" ? (
        <input
          {...common}
          inputMode={input.kind === "int" ? "numeric" : "decimal"}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : input.kind === "text" ? (
        <input
          {...common}
          type="text"
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">{t("form.notAnswered")}</option>
          {(input.kind === "yesno" ? ["yes", "no"] : input.options).map((opt) => (
            <option key={opt} value={opt}>
              {t(`form.options.${input.kind === "yesno" ? "yesno" : field}.${opt}`)}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}

function Results({ status, fieldLabel }: { status: Status; fieldLabel: (f: Field) => string }) {
  const t = useTranslations("results");
  const te = useTranslations("errors");
  if (status.kind === "idle") return <p className="text-sm text-slate-700">{t("empty")}</p>;
  if (status.kind === "loading") return null;
  if (status.kind === "error")
    return (
      <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
        {te(status.error)}
      </p>
    );
  const { data } = status;
  // Another state's schemes can't apply to this family, so they are counted, not listed.
  const own = data.not_eligible.filter((s) => !s.other_state);
  const otherStates = data.not_eligible.length - own.length;
  return (
    <div className="space-y-5">
      <p className="rounded bg-amber-50 p-3 text-sm text-amber-950">{t("disclaimer")}</p>
      <p className="text-xs text-slate-600">{t("englishOnly")}</p>
      <Group
        title={t("eligible", { count: data.eligible.length })}
        count={data.eligible.length}
        empty={t("none")}
      >
        {data.eligible.map((s) => (
          <li key={s.slug} className="rounded border border-emerald-300 bg-white p-3">
            <p className="font-medium" lang="en">
              {s.title}
            </p>
            <p className="text-sm text-slate-700" lang="en">
              {s.benefit}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase text-slate-600">{t("why")}</p>
            <ul className="list-disc pl-5 text-sm" lang="en">
              {s.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {s.also_confirm.length > 0 && (
              <>
                <p className="mt-2 text-xs font-semibold uppercase text-slate-600">
                  {t("alsoConfirm")}
                </p>
                <ul className="list-disc pl-5 text-sm" lang="en">
                  {s.also_confirm.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            )}
            <a
              href={s.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-sky-800 underline"
            >
              {t("official")}
            </a>
          </li>
        ))}
      </Group>
      <Group
        title={t("needInfo", { count: data.need_info.length })}
        count={data.need_info.length}
        empty={t("none")}
      >
        {data.next_question && (
          <li className="rounded bg-sky-50 p-2 text-sm font-medium text-sky-950">
            {t("nextQuestion", { field: fieldLabel(data.next_question) })}
          </li>
        )}
        {data.need_info.map((s) => (
          <li key={s.slug} className="rounded border border-slate-300 bg-white p-3 text-sm">
            <span className="font-medium" lang="en">
              {s.title}
            </span>{" "}
            · {t("missing", { fields: s.missing.map(fieldLabel).join(", ") })}
            <OtherWays items={s.other_ways} label={t("otherWays")} />
          </li>
        ))}
      </Group>
      <Group title={t("notEligible", { count: own.length })} count={own.length} empty={t("none")}>
        {own.map((s) => (
          <li key={s.slug} className="rounded border border-slate-200 bg-white p-3 text-sm">
            <span className="font-medium" lang="en">
              {s.title}
            </span>
            {s.closest_miss && (
              <>
                {" "}
                · {t("closestMiss")} <span lang="en">{s.closest_miss}</span>
              </>
            )}
            <OtherWays items={s.other_ways} label={t("otherWays")} />
          </li>
        ))}
      </Group>
      {otherStates > 0 && (
        <p className="text-sm text-slate-600">{t("otherStates", { count: otherStates })}</p>
      )}
    </div>
  );
}

function OtherWays({ items, label }: { items: string[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <ul className="list-disc pl-5" lang="en">
        {items.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

function Group({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 font-semibold">{title}</h3>
      {count > 0 ? (
        <ul className="space-y-2">{children}</ul>
      ) : (
        <p className="text-sm text-slate-600">{empty}</p>
      )}
    </section>
  );
}
