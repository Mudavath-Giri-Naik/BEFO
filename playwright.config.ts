import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  // e2e runs on the demo fixtures so it never depends on (or writes to) the real Supabase project
  webServer: { command: "pnpm build && pnpm preview --port 4173 --strictPort", port: 4173, reuseExistingServer: false, timeout: 180_000, env: { VITE_DATA_SOURCE: "demo" } },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
})
