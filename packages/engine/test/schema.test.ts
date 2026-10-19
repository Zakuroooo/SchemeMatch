import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import schema from "../rule.schema.json" with { type: "json" };
import { FIELDS } from "../src/index.ts";

const validate = new Ajv2020({ allErrors: true }).compile(schema);
const q = "quoted from the source";

describe("rule.schema.json", () => {
  it("accepts the DATA.md example tree", () => {
    const example = {
      all: [
        { field: "state", op: "eq", value: "MH", source_quote: q },
        { field: "age", op: "gte", value: 18, source_quote: q },
        {
          any: [
            { field: "marital_status", op: "in", value: ["widow", "divorced"], source_quote: q },
            { field: "disability_percent", op: "between", value: [40, 100], source_quote: q },
          ],
        },
      ],
    };
    expect(validate(example), JSON.stringify(validate.errors)).toBe(true);
  });

  it.each([
    ["between with one number", { field: "age", op: "between", value: 18, source_quote: q }],
    ["gte with a string", { field: "age", op: "gte", value: "18", source_quote: q }],
    ["unknown field", { field: "name", op: "eq", value: "Sunita", source_quote: q }],
    ["missing source_quote", { field: "age", op: "gte", value: 18 }],
    ["empty any group", { any: [] }],
    ["extra key", { field: "age", op: "gte", value: 18, source_quote: q, note: "x" }],
  ])("rejects %s", (_name, node) => {
    expect(validate(node)).toBe(false);
  });

  it("lists the same fields as the TypeScript types", () => {
    expect(schema.$defs.field.enum).toEqual([...FIELDS]);
  });
});
