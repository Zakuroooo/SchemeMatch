import { describe, expect, it } from "vitest";
import bn from "../messages/bn.json";
import en from "../messages/en.json";

type Tree = { [key: string]: string | Tree };
const keys = (t: Tree, prefix = ""): string[] =>
  Object.entries(t).flatMap(([k, v]) =>
    typeof v === "string" ? [prefix + k] : keys(v, `${prefix}${k}.`),
  );
const get = (t: Tree, path: string) =>
  path
    .split(".")
    .reduce<string | Tree | undefined>(
      (node, k) => (typeof node === "object" ? node[k] : undefined),
      t,
    );

describe("messages", () => {
  it("English and Bengali have exactly the same keys", () => {
    expect(keys(bn as Tree).sort()).toEqual(keys(en as Tree).sort());
  });

  it("no message is empty", () => {
    for (const [name, m] of [
      ["en", en],
      ["bn", bn],
    ] as const) {
      for (const k of keys(m as Tree))
        expect(String(get(m as Tree, k)).trim(), `${name}:${k}`).not.toBe("");
    }
  });

  it("Bengali screens are really in Bengali (no English left by mistake)", () => {
    const allowedLatin = /^(SchemeMatch|English)$/;
    const bengali = /[ঀ-৿]/;
    for (const k of keys(bn as Tree)) {
      const v = String(get(bn as Tree, k));
      if (allowedLatin.test(v)) continue;
      expect(bengali.test(v), k).toBe(true);
    }
  });
});
