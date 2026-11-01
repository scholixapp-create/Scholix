import { test as unit, expect as unitExpect } from "@playwright/test";
import { legacyParentSessionsRedirect, resolveSafeRedirect, postAuthDestination, withRedirect, legacyTutorRedirect, canGoBackInternally } from "../../src/lib/navigation";
import { test, expect, sessions, users } from "./fixtures";

unit.describe("safe redirect helper", () => {
  unit("allows known public tutor and parent booking destinations", () => {
    unitExpect(resolveSafeRedirect("/tutor/42")).toBe("/tutor/42");
    unitExpect(resolveSafeRedirect("/parent/book/42", "parent")).toBe("/parent/book/42");
    unitExpect(resolveSafeRedirect("%2Fparent%2Fbook%2F42", "parent")).toBe("/parent/book/42");
    unitExpect(resolveSafeRedirect("/parent/dashboard?reviewSession=7", "parent")).toBe("/parent/dashboard?reviewSession=7");
  });
  unit("sends non-parents somewhere they can use, never a parent-only loop", () => {
    unitExpect(resolveSafeRedirect("/parent/book/42", "tutor")).toBe("/tutor/42");
    unitExpect(postAuthDestination("/parent/book/42", "admin")).toBe("/tutor/42");
    unitExpect(postAuthDestination("/parent/dashboard?reviewSession=7", "tutor")).toBe("/tutor/dashboard");
  });
  unit("rejects external, protocol-relative, backslash, control and auth loop values", () => {
    for (const bad of [
      "https://evil.example", "//evil.example", "/%2F%2Fevil.example", "%2F%2Fevil.example",
      "/\\evil.example", "/%5Cevil.example", "/tutor/1%0A", "/tutor/1\n", "/tutor/%2509",
      "javascript:alert(1)", "/login?redirect=%2Ftutor%2F1", "/signup", "/admin/dashboard",
      "/tutor/0", "/tutor/abc", "", null, undefined,
    ]) unitExpect(resolveSafeRedirect(bad), String(bad)).toBeNull();
    unitExpect(postAuthDestination("//evil.example", "parent")).toBe("/parent/dashboard");
  });
  unit("encodes redirects and handles legacy share links", () => {
    unitExpect(withRedirect("/login", "/parent/book/42")).toBe("/login?redirect=%2Fparent%2Fbook%2F42");
    unitExpect(withRedirect("/login", "https://evil.example")).toBe("/login");
    unitExpect(legacyTutorRedirect("id=12")).toBe("/tutor/12");
    unitExpect(legacyTutorRedirect("id=12abc")).toBeNull();
    unitExpect(legacyTutorRedirect("")).toBeNull();
  });
  unit("maps legacy /parent/sessions notification links to the review section", () => {
    unitExpect(legacyParentSessionsRedirect("")).toBe("/parent/dashboard?section=reviews");
    unitExpect(legacyParentSessionsRedirect("sessionId=9302")).toBe("/parent/dashboard?reviewSession=9302");
    unitExpect(legacyParentSessionsRedirect("sessionId=abc")).toBe("/parent/dashboard?section=reviews");
    unitExpect(legacyParentSessionsRedirect("id=0")).toBe("/parent/dashboard?section=reviews");
  });
  unit("history fallback only goes back after an internal entry", () => {
    unitExpect(canGoBackInternally(1, 5)).toBe(false);
    unitExpect(canGoBackInternally(2, 1)).toBe(false);
    unitExpect(canGoBackInternally(2, 3)).toBe(true);
  });
});

test.describe("404 back button", () => {
  test.use({ role: "parent" });
  test("falls back to home on a direct landing", async ({ page }) => {
    await page.goto("/definitely-missing-page");
    await page.getByTestId("button-go-back").click();
    await expect(page).toHaveURL(/\/$/);
  });
  test("blank predecessor plus replaceState to a missing page goes home", async ({ page }) => {
    await page.goto("about:blank");
    await page.goto("/about");
    await page.evaluate(() => {
      history.replaceState(history.state, "", "/missing-replaced");
      dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    });
    await page.getByTestId("button-go-back").click();
    await expect(page).toHaveURL(new URL("/", test.info().project.use.baseURL).href);
  });
  test("internal push to a missing page returns to the prior page", async ({ page }) => {
    await page.goto("/about");
    await page.evaluate(() => {
      history.pushState({ kept: true }, "", "/missing-pushed");
      dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    });
    expect(await page.evaluate(() => (history.state as { kept?: boolean }).kept)).toBe(true);
    await page.getByTestId("button-go-back").click();
    await expect(page).toHaveURL(/\/about$/);
  });
  test("back to the first app entry then replace to missing falls back home", async ({ page }) => {
    await page.goto("/about");
    await page.evaluate(() => {
      history.pushState(null, "", "/terms");
      dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    });
    await page.goBack();
    await expect(page).toHaveURL(/\/about$/);
    await page.evaluate(() => {
      history.replaceState(history.state, "", "/missing-after-pop");
      dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    });
    await page.getByTestId("button-go-back").click();
    await expect(page).toHaveURL(new URL("/", test.info().project.use.baseURL).href);
  });
  test("never leaves the site when the 404 was opened from another origin", async ({ page }) => {
    await page.goto("about:blank");
    await page.goto("/another-missing-page");
    await page.getByTestId("button-go-back").click();
    await expect(page).toHaveURL(new URL("/", test.info().project.use.baseURL).href);
  });
});

for (const role of ["tutor", "parent", "student", "admin"] as const) {
  test.describe(`mobile account menu (${role})`, () => {
    test.use({ role });
    test("exposes profile, settings, about and sign out", async ({ page }) => {
      await page.goto(role === "admin" ? "/admin/sessions" : role === "tutor" ? "/tutor/profile" : `/${role}/dashboard`);
      await page.getByRole("button", { name: "Account menu" }).click();
      const menu = page.getByRole("menu");
      for (const name of ["Profile", "Settings", "About Scholix", "Sign out"]) {
        await expect(menu.getByRole("menuitem", { name })).toBeVisible();
      }
      await menu.getByRole("menuitem", { name: "Settings" }).click();
      await expect(page).toHaveURL(/\/settings$/);
    });
  });
}

test.describe("session review", () => {
  test.use({ role: "parent" });
  const completed = sessions[1];
  const reviewUrl = `**/api/sessions/${completed.id}/reviews`;
  const saved = { id: 9701, sessionId: completed.id, authorId: 9002, tutorId: completed.tutorId, rating: 4, comment: "Clear explanations", createdAt: "2030-11-03T09:00:00.000Z" };

  test("submits a review once and shows the saved state", async ({ page }) => {
    let posts = 0;
    await page.route(reviewUrl, async (route) => {
      if (route.request().method() === "POST") {
        posts += 1;
        await new Promise((r) => setTimeout(r, 300));
        return route.fulfill({ status: 201, json: saved });
      }
      return route.fulfill({ json: posts ? { eligible: false, review: saved } : { eligible: true, review: null } });
    });
    await page.goto(`/parent/dashboard?reviewSession=${completed.id}`);
    const dialog = page.getByTestId("dialog-session-review");
    await dialog.getByTestId("button-rating-4").click();
    await dialog.getByTestId("input-review-comment").fill("Clear explanations");
    await dialog.getByTestId("button-review-submit").click();
    const confirm = dialog.getByTestId("button-review-confirm");
    await confirm.click();
    await expect(confirm).toBeDisabled();
    await expect(dialog.getByTestId("status-review-saved")).toBeVisible();
    expect(posts).toBe(1);
  });

  test("shows the existing review read-only on reopen", async ({ page }) => {
    await page.route(reviewUrl, (route) => route.fulfill({ json: { eligible: false, review: saved } }));
    await page.goto("/parent/dashboard");
    await page.getByTestId(`button-review-session-${completed.id}`).click();
    await expect(page.getByTestId("text-review-comment")).toHaveText("Clear explanations");
    await expect(page.getByTestId("button-review-submit")).toHaveCount(0);
  });

  test("handles duplicate and server errors", async ({ page }) => {
    let status = 500;
    await page.route(reviewUrl, (route) => route.request().method() === "POST"
      ? route.fulfill({ status, json: { error: "fail" } })
      : route.fulfill({ json: status === 409 ? { eligible: false, review: saved } : { eligible: true, review: null } }));
    await page.goto(`/parent/dashboard?reviewSession=${completed.id}`);
    const dialog = page.getByTestId("dialog-session-review");
    await dialog.getByTestId("button-rating-5").click();
    await dialog.getByTestId("button-review-submit").click();
    await dialog.getByTestId("button-review-confirm").click();
    await expect(dialog.getByTestId("text-review-error")).toContainText("could not save");
    status = 409;
    await dialog.getByTestId("button-review-submit").click();
    await dialog.getByTestId("button-review-confirm").click();
    await expect(dialog.getByTestId("text-review-error")).toContainText("already exists");
    await expect(dialog.getByTestId("status-review-saved")).toBeVisible();
  });

  test("legacy /parent/sessions link lands on the completed review section", async ({ page }) => {
    await page.goto("/parent/sessions");
    await expect(page).toHaveURL(/\/parent\/dashboard\?section=reviews$/);
    await expect(page.getByTestId(`button-review-session-${completed.id}`)).toBeVisible();
  });

  for (const bad of ["abc", "999999", "-1", "1e3"]) {
    test(`reports unknown or invalid notification session id ${bad}`, async ({ page }) => {
      await page.goto(`/parent/dashboard?reviewSession=${encodeURIComponent(bad)}`);
      await expect(page.getByTestId("text-review-deeplink-error")).toBeVisible();
      await expect(page.getByTestId("dialog-session-review")).toHaveCount(0);
    });
  }

  test("reports an unavailable deep-linked session", async ({ page }) => {
    await page.goto(`/parent/dashboard?reviewSession=${sessions[0].id}`);
    await expect(page.getByTestId("text-review-deeplink-error")).toBeVisible();
    await expect(page.getByTestId("dialog-session-review")).toHaveCount(0);
  });
});

test.describe("auth redirect through OTP", () => {
  test.use({ role: "parent" });
  const tutorId = 9201;
  const bookingPath = `/parent/book/${tutorId}`;

  // Local-only auth and booking overrides. Registered after the shared fixture so
  // they take precedence; everything else still hits the read-only guard.
  async function mockAuthFlow(page: import("@playwright/test").Page) {
    let verified = false;
    const calls = { login: 0, verify: 0 };
    await page.route("**/api/auth/me", (route) => verified
      ? route.fulfill({ json: users.parent })
      : route.fulfill({ status: 401, json: { error: "Not signed in" } }));
    await page.route("**/api/auth/login", (route) => {
      calls.login += 1;
      return route.fulfill({ json: { requiresOtp: true, pendingUserId: users.parent.id, email: users.parent.email, devOtp: "246810" } });
    });
    await page.route("**/api/auth/verify-otp", (route) => {
      calls.verify += 1;
      verified = true;
      return route.fulfill({ json: { user: users.parent, token: "local-otp-fixture-not-a-real-token" } });
    });
    await page.route(`**/api/tutors/${tutorId}`, (route) => route.fulfill({ json: {
      id: tutorId, userId: users.tutor.id, firstName: "Alexandria", lastName: "Layout Fixture",
      email: users.tutor.email, bio: "Local layout fixture tutor", subjects: ["Maths", "English"],
      hourlyRate: 85, isApproved: true, verificationStatus: "verified", educationDetails: null,
      sessionCount: 12, sessionDurations: [60], teachingMode: "online", travelBufferMinutes: 0,
      createdAt: users.tutor.createdAt,
    } }));
    await page.route(`**/api/tutors/${tutorId}/relationships/**`, (route) =>
      route.fulfill({ status: 404, json: { error: "No relationship fixture" } }));
    await page.addInitScript(() => {
      // The shared fixture seeds a fake token; start this flow signed out.
      localStorage.removeItem("scholix_token");
      localStorage.removeItem("scholix_user");
    });
    return calls;
  }

  async function completeOtp(page: import("@playwright/test").Page) {
    await page.locator('input[type="email"]').fill("parent@layout.example.invalid");
    await page.locator('input[type="password"]').fill("fixture-password-not-real");
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('input[inputmode="numeric"]').first()).toHaveValue("2");
    await page.locator('form button[type="submit"]').click();
  }

  test("keeps the booking destination through signup switch and OTP", async ({ page, baseURL }) => {
    const calls = await mockAuthFlow(page);
    await page.goto(bookingPath);
    await expect(page).toHaveURL(/\/login\?redirect=%2Fparent%2Fbook%2F9201$/);
    await page.getByTestId("link-signup").click();
    await expect(page).toHaveURL(/\/signup\?redirect=%2Fparent%2Fbook%2F9201$/);
    await page.getByTestId("link-login").click();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fparent%2Fbook%2F9201$/);
    await completeOtp(page);
    await expect(page).toHaveURL(new URL(bookingPath, baseURL).href);
    expect(calls).toEqual({ login: 1, verify: 1 });
  });

  test("ignores a malicious external redirect after OTP", async ({ page, baseURL }) => {
    const calls = await mockAuthFlow(page);
    await page.goto(`/login?redirect=${encodeURIComponent("https://evil.example/parent/book/9201")}`);
    await completeOtp(page);
    await expect(page).toHaveURL(new URL("/parent/dashboard", baseURL).href);
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
    expect(calls).toEqual({ login: 1, verify: 1 });
  });
});
