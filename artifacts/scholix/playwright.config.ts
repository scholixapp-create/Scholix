import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const baseURL = process.env.MOBILE_TEST_BASE_URL ?? "http://localhost:8080";
const host = new URL(baseURL).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(host) && !host.endsWith(".replit.dev")) {
  throw new Error("Mobile checks may only target local development, never production.");
}

export default defineConfig({
  testDir: "./tests/mobile",
  outputDir: "../../generated-artifacts/mobile/results",
  reporter: [["list"], ["html", { outputFolder: "../../generated-artifacts/mobile/report", open: "never" }]],
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL, browserName: "chromium", serviceWorkers: "block", trace: "retain-on-failure",
    launchOptions: {
      // Use Replit's library-compatible browser when available, standard Playwright elsewhere.
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
        (existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined),
    },
  },
  projects: [320, 390].flatMap((width) =>
    (["no-preference", "reduce"] as const).map((reducedMotion) => ({
      name: `${width}-${reducedMotion}`,
      use: { viewport: { width, height: 740 }, reducedMotion },
    })),
  ),
});
