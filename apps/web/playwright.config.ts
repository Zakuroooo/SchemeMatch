import { defineConfig, devices } from "@playwright/test";

// End-to-end: a real browser, the production build of this app and the real API, both on
// this machine. No mocks and no database: the API answers from its bundled golden schemes.
const WEB = "http://localhost:3100";
const API = "http://localhost:3101";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: WEB, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "pnpm --filter @schemematch/api start",
      url: `${API}/health`,
      // Blank Supabase settings force the bundled schemes, even if the shell has real ones.
      env: {
        PORT: "3101",
        WEB_ORIGINS: WEB,
        SUPABASE_URL: "",
        SUPABASE_ANON_KEY: "",
        SUPABASE_SECRET_KEY: "",
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      // NEXT_PUBLIC_ values are fixed at build time, so this builds with the local API address.
      command: "pnpm build && pnpm start --port 3100",
      url: `${WEB}/en`,
      env: { NEXT_PUBLIC_API_URL: API },
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
