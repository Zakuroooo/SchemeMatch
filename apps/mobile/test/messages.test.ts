import { FIELDS } from "@schemematch/engine";
import { LANGUAGES, translate } from "@/i18n";
import bn from "@/i18n/bn.json";
import en from "@/i18n/en.json";
import { QUESTIONS } from "@/lib/questions";

type Tree = { [key: string]: string | Tree };
const keys = (t: Tree, prefix = ""): string[] =>
  Object.entries(t).flatMap(([k, v]) =>
    typeof v === "string" ? [prefix + k] : keys(v, `${prefix}${k}.`),
  );

describe("messages", () => {
  it("English and Bengali have exactly the same keys", () => {
    expect(keys(bn as Tree).sort()).toEqual(keys(en as Tree).sort());
  });

  it("no message is empty", () => {
    for (const l of LANGUAGES)
      for (const k of keys((l === "en" ? en : bn) as Tree))
        expect(translate(l, k).trim()).not.toBe("");
  });

  it("every question and every answer option has a label in both languages", () => {
    for (const l of LANGUAGES)
      for (const f of FIELDS) {
        expect(translate(l, `questions.${f}`)).not.toBe(`questions.${f}`);
        const q = QUESTIONS[f];
        const opts = q.kind === "choice" ? q.options : q.kind === "yesno" ? ["yes", "no"] : [];
        const group = q.kind === "yesno" ? "yesno" : f;
        for (const o of opts)
          expect(translate(l, `options.${group}.${o}`)).not.toBe(`options.${group}.${o}`);
      }
  });

  it("Bengali questions really are in Bengali script", () => {
    for (const f of FIELDS) expect(translate("bn", `questions.${f}`)).toMatch(/[ঀ-৿]/);
  });

  it("fills placeholders and uses the singular form for one", () => {
    expect(translate("en", "results.otherStates", { count: 9 })).toBe(
      "9 schemes are only for other states.",
    );
    expect(translate("en", "results.otherStates", { count: 1 })).toBe(
      "1 scheme is only for another state.",
    );
    expect(translate("en", "no.such.key")).toBe("no.such.key");
  });
});
