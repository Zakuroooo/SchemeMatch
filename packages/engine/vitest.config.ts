import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // The engine decides what benefits people are told about: every branch must be tested.
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
