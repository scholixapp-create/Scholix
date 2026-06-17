import { Router } from "express";
import { db, reportsTable, usersTable, sessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/authMiddleware";
import { sendEmail } from "../lib/email";

const router = Router();

const VALID_CATEGORIES = ["safety_concern", "inappropriate_behaviour", "payment_issue", "tutoring_quality", "other"] as const;

// Submit a report
router.post("/reports", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const { category, message, reportedUserId, sessionId } = req.body ?? {};

  if (!category || !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }

  if (!message || typeof message !== "string" || message.trim().length < 10) {
    res.status(400).json({ error: "Description must be at least 10 characters" });
    return;
  }

  const [report] = await db
    .insert(reportsTable)
    .values({
      reporterUserId: user.id,
      reportedUserId: reportedUserId ? parseInt(String(reportedUserId), 10) : null,
      sessionId: sessionId ? parseInt(String(sessionId), 10) : null,
      category,
      message: message.trim(),
      status: "open",
    })
    .returning();

  // Notify admin
  const adminEmail = process.env["ADMIN_EMAIL"];
  if (adminEmail) {
    const categoryLabel = category.replace(/_/g, " ");
    await sendEmail({
      to: adminEmail,
      subject: `New ${categoryLabel} report — Scholix`,
      html: `
        <p><strong>New report submitted on Scholix</strong></p>
        <p><strong>Category:</strong> ${categoryLabel}</p>
        <p><strong>Reporter:</strong> ${user.firstName} ${user.lastName} (${user.email})</p>
        ${reportedUserId ? `<p><strong>Reported user ID:</strong> ${reportedUserId}</p>` : ""}
        ${sessionId ? `<p><strong>Session ID:</strong> ${sessionId}</p>` : ""}
        <p><strong>Description:</strong><br/>${message.trim()}</p>
        <p>Log in to the Scholix admin panel to review this report.</p>
      `,
    });
  }

  res.status(201).json({ ok: true, reportId: report.id });
});

// Admin: list all reports
router.get("/admin/reports", requireAdmin, async (_req, res) => {
  const reports = await db
    .select({
      id: reportsTable.id,
      reporterUserId: reportsTable.reporterUserId,
      reportedUserId: reportsTable.reportedUserId,
      sessionId: reportsTable.sessionId,
      category: reportsTable.category,
      message: reportsTable.message,
      status: reportsTable.status,
      createdAt: reportsTable.createdAt,
    })
    .from(reportsTable)
    .orderBy(desc(reportsTable.createdAt));

  const enriched = await Promise.all(
    reports.map(async (r) => {
      const [reporter] = await db
        .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, r.reporterUserId))
        .limit(1);

      let reportedUser = null;
      if (r.reportedUserId) {
        const [ru] = await db
          .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.id, r.reportedUserId))
          .limit(1);
        reportedUser = ru ?? null;
      }

      return {
        ...r,
        createdAt: r.createdAt.toISOString(),
        reporter: reporter ?? null,
        reportedUser,
      };
    })
  );

  res.json(enriched);
});

// Admin: resolve a report
router.put("/admin/reports/:reportId/resolve", requireAdmin, async (req, res) => {
  const reportId = parseInt(req.params["reportId"] as string, 10);
  if (isNaN(reportId)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const [updated] = await db
    .update(reportsTable)
    .set({ status: "resolved" })
    .where(eq(reportsTable.id, reportId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.json({ ok: true });
});

export default router;
