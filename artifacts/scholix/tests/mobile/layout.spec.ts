import { test, expect, type Role } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

async function fitsViewport(locator: Locator, page: Page) {
  const viewport = page.viewportSize()!;
  // Opening dialogs animate their translation; assert settled geometry rather
  // than sampling a random intermediate frame on normal-motion projects.
  await expect.poll(async () => {
    const box = await locator.boundingBox();
    return !!box && box.x >= -1 && box.x + box.width <= viewport.width + 1 &&
      box.y >= -1 && box.y + box.height <= viewport.height + 1;
  }, { message: "Element should settle entirely inside the viewport" }).toBe(true);
}

async function noPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const main = page.locator("main");
  expect(await main.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
}

async function readableBadges(page: Page) {
  const badges = page.locator("[data-status-badge]");
  expect(await badges.count()).toBeGreaterThan(0);
  const ratios = await badges.evaluateAll((elements) => {
    // Tailwind v4 emits OKLCH as well as RGB; normalize through the browser's
    // canvas rather than incorrectly interpreting OKLCH numbers as RGB.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const luminance = (color: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const channels = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map((n) => {
        const s = n / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    return elements.map((el) => {
      const style = getComputedStyle(el);
      const a = luminance(style.color), b = luminance(style.backgroundColor);
      return { text: el.textContent, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
  });
  for (const badge of ratios) expect(badge.ratio, `${badge.text} contrast`).toBeGreaterThanOrEqual(4.5);
}

async function sharedShell(page: Page) {
  await noPageOverflow(page);
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await fitsViewport(nav, page);
  // Every destination remains reachable, even when the bar needs scrolling.
  for (const link of await nav.getByRole("link").all()) {
    await link.scrollIntoViewIfNeeded();
    await fitsViewport(link, page);
  }
  await page.getByRole("button", { name: "Notifications", exact: true }).filter({ visible: true }).click();
  const panel = page.getByRole("region", { name: "Notifications", exact: true });
  await expect(panel).toHaveCount(1);
  await expect(panel.getByText("Fixture session 1 needs notes")).toBeVisible();
  await fitsViewport(panel, page);
  await panel.locator("[data-notification-list]").evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(panel.getByText("Fixture session 8 needs notes")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await page.getByRole("button", { name: "Notifications", exact: true }).filter({ visible: true }).click();
  // Outside the fixed panel, not a heading obscured by the open panel.
  await page.mouse.click(4, 4);
  await expect(panel).toHaveCount(0);
}

async function reducedMotion(page: Page) {
  if (!await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
  const moving = await page.evaluate(() =>
    document.getAnimations().filter((animation) => animation.playState === "running").length,
  );
  expect(moving, "Reduced-motion pages must have no running CSS animations").toBe(0);
}

for (const role of ["tutor", "parent", "student", "admin"] as Role[]) {
  test.describe(role, () => {
    test.use({ role });
    test("signed-in narrow-screen layout", async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const start = role === "admin" ? "/admin/sessions" : role === "parent" ? "/parent/students" : `/${role}/dashboard`;
      await page.goto(start);
      await expect(page.locator("main h1")).toBeVisible();
      if (role === "admin" || role === "student" || role === "tutor") {
        await expect(page.locator("[data-status-badge]").first()).toBeVisible();
        await readableBadges(page);
      } else {
        await expect(page.getByText("Local Fixture Secondary College")).toBeVisible();
      }
      await sharedShell(page);
      await reducedMotion(page);
      await page.screenshot({ path: testInfo.outputPath(`${role}-page.png`) });

      if (role === "admin") {
        await page.getByRole("button", { name: /View session 9301/ }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByText("Booking, participant and payment information.")).toBeVisible();
        await fitsViewport(dialog, page);
        expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await reducedMotion(page);
        await page.screenshot({ path: testInfo.outputPath("session-dialog.png") });
        await page.keyboard.press("Escape");
        await page.goto("/admin/users");
        await page.getByRole("searchbox").fill("Layout");
        await expect(page.getByText("4 matching users")).toBeVisible();
        await noPageOverflow(page);
      }
      if (role === "parent") {
        await page.getByRole("button", { name: /Add student/i }).first().click();
        const form = page.locator("form");
        await expect(form).toBeVisible();
        for (const input of await form.locator("input, select, textarea").all()) {
          await input.scrollIntoViewIfNeeded();
          await fitsViewport(input, page);
        }
        await reducedMotion(page);
        await page.screenshot({ path: testInfo.outputPath("student-form.png") });
      }
      if (role === "tutor") {
        await page.goto("/tutor/earnings");
        await expect(page.getByText("Mathematical Methods").first()).toBeVisible();
        await noPageOverflow(page);
        await page.screenshot({ path: testInfo.outputPath("mobile-earnings.png") });
        // The same data switches from cards to an actual table at md.
        await page.setViewportSize({ width: 820, height: 900 });
        await expect(page.getByRole("table")).toBeVisible();
        await noPageOverflow(page);
        await page.screenshot({ path: testInfo.outputPath("earnings-table.png") });
      }
      if (role === "student") {
        await page.getByRole("button", { name: /History/ }).click();
        await expect(page.getByText("Mathematical Methods").first()).toBeVisible();
        await noPageOverflow(page);
        await page.goto("/settings");
        await page.getByRole("button", { name: "Profile", exact: true }).click();
        await expect(page.locator("input").first()).toBeVisible();
        await noPageOverflow(page);
      }
      expect(errors, "No browser crashes").toEqual([]);
    });
  });
}
