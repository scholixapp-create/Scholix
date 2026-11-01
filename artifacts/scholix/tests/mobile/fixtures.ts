import { test as base, expect, type Page } from "@playwright/test";

export type Role = "tutor" | "parent" | "student" | "admin";
const createdAt = "2026-10-01T09:00:00.000Z";
export const users = Object.fromEntries(
  (["tutor", "parent", "student", "admin"] as const).map((role, i) => [
    role, {
      id: 9001 + i, role, firstName: "Alexandria-Cassandra", lastName: "Layout Fixture",
      email: `${role}@layout.example.invalid`, createdAt, isActive: true,
    },
  ]),
);
const student = {
  id: 9101, userId: users.student.id, parentId: users.parent.id,
  firstName: "Alexandria", lastName: "Layout Fixture", yearLevel: "VCE Year 12",
  school: "Local Fixture Secondary College", subjects: "Maths,English",
  goals: "Improve confidence in multi-step problems", createdAt, isIdentityVerified: true,
};
const tutor = {
  id: 9201, userId: users.tutor.id, firstName: "Alexandria", lastName: "Layout Fixture",
  subjects: ["Maths", "English"], hourlyRate: 85, bio: "Local layout fixture tutor",
  isApproved: true, verificationStatus: "approved", wwccNumber: "FIXTURE",
  rating: 4.8, totalSessions: 12, completedSessions: 12,
};
export const sessions = ["scheduled", "completed", "cancelled"].map((status, i) => ({
  id: 9301 + i, tutorId: tutor.id, studentId: student.id, parentId: users.parent.id,
  subject: "Mathematical Methods", tutorName: "Alexandria Layout Fixture",
  studentName: "Alexandria Layout Fixture", scheduledAt: `2030-11-0${i + 2}T09:00:00.000Z`,
  durationMinutes: 60, totalAmount: 85, status, isPaid: true, createdAt,
  isCommissionFree: false,
}));
const invoices = [sessions[1]].map((session) => ({
  id: 9401, sessionId: session.id, studentName: session.studentName,
  subject: session.subject, totalAmount: 85, platformCommission: 25.5,
  tutorEarnings: 59.5, commissionRate: 0.3, commissionTier: "standard",
  generatedAt: createdAt, scheduledAt: session.scheduledAt, invoiceNumber: "FIXTURE-9401",
}));

// Browser-only API fixtures. Nothing is seeded in a database and the fake token
// is never sent to a server. Unknown API calls and all writes fail the test.
export async function installRoleFixtures(page: Page, role: Role) {
  const unexpected: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem("scholix_token", "local-layout-fixture-not-a-real-token");
  });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");
    let data: unknown;
    if (request.method() !== "GET") {
      unexpected.push(`${request.method()} ${path}`);
      return route.fulfill({ status: 405, json: { error: "Fixture is read-only" } });
    }
    if (path === "/api/auth/me") data = users[role];
    else if (path === "/api/notifications") data = Array.from({ length: 8 }, (_, i) => ({
      id: 9501 + i, type: "action_upload_notes", title: `Fixture session ${i + 1} needs notes`,
      message: "A longer local fixture notification checks wrapping and scrolling on narrow screens.",
      actionUrl: `/${role}/dashboard`, actionLabel: "View session", isRead: false, createdAt,
    }));
    else if (path === "/api/students") data = [student];
    else if (path === "/api/tutors") data = [tutor];
    else if (path === "/api/tutors/me") data = tutor;
    else if (path === `/api/tutors/${tutor.id}/availability`) data = [{
      id: 9601, tutorId: tutor.id, date: "2030-11-02", startTime: "09:00", endTime: "10:00", isBooked: false,
    }];
    else if (path === "/api/sessions/summary") data = {
      total: 3, scheduled: 1, completed: 1, cancelled: 1, totalEarnings: 59.5, totalRevenue: 85,
    };
    else if (path === "/api/sessions") data = sessions;
    else if (path.startsWith("/api/sessions/")) data = sessions.find((s) => path === `/api/sessions/${s.id}`);
    else if (path === "/api/invoices") data = invoices;
    else if (path === "/api/admin/users") data = Object.values(users);
    else if (path.startsWith("/api/admin/users/")) data = Object.values(users).find((u) => path === `/api/admin/users/${u.id}`);
    else if (path === "/api/settings") data = {
      emailNotificationsEnabled: true, phone: "0400000000", address: "Local fixture address",
    };
    if (data === undefined) {
      unexpected.push(`${request.method()} ${path}`);
      return route.fulfill({ status: 501, json: { error: `Missing fixture for ${path}` } });
    }
    await route.fulfill({ json: data });
  });
  return unexpected;
}

export const test = base.extend<{ role: Role; fixtureRequests: string[] }>({
  role: ["student", { option: true }],
  fixtureRequests: [async ({ page, role }, use) => {
    const unexpected = await installRoleFixtures(page, role);
    await use(unexpected);
    expect(unexpected, "Every API request must have an explicit read-only local fixture").toEqual([]);
  }, { auto: true }],
});
export { expect };
