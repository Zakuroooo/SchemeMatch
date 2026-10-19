import { describe, expect, it } from "vitest";
import { allOf, anyOf } from "../src/logic.ts";
import type { Tri } from "../src/index.ts";

const P: Tri = "PASS";
const F: Tri = "FAIL";
const U: Tri = "UNKNOWN";

// Full truth tables for two inputs (DATA.md §3).
describe("three-valued logic", () => {
  it.each([
    [P, P, P],
    [P, U, U],
    [P, F, F],
    [U, U, U],
    [U, F, F],
    [F, F, F],
  ])("all(%s, %s) = %s", (a, b, out) => {
    expect(allOf([a, b])).toBe(out);
    expect(allOf([b, a])).toBe(out);
  });

  it.each([
    [P, P, P],
    [P, U, P],
    [P, F, P],
    [U, U, U],
    [U, F, U],
    [F, F, F],
  ])("any(%s, %s) = %s", (a, b, out) => {
    expect(anyOf([a, b])).toBe(out);
    expect(anyOf([b, a])).toBe(out);
  });

  it("empty all is PASS (no requirements); empty any is FAIL (no way to qualify)", () => {
    expect(allOf([])).toBe("PASS");
    expect(anyOf([])).toBe("FAIL");
  });
});
