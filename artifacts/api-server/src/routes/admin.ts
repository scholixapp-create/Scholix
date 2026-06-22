import { Router } from "express";
import { db, usersTable, tutorsTable, sessionsTable, invoicesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/authMiddleware";

const router = Router();

// Only guard actual /admin/* paths — skip this router for other paths
router.use((req, res, next) => {
  if (!req.path.startsWith("/admin")) return next("router");
  return requireAdmin(req, res, next);
});

router.get("/admin/users", async (_req, res) => {
  const users = await db.select().from(usersTable);
  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

router.get("/admin/stats", async (_req, res) => {
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [tutorCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tutorsTable);
  const [approvedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tutorsTable)
    .where(eq(tutorsTable.isApproved, true));

  const sessions = await db.select().from(sessionsTable);
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const scheduledSessions = sessions.filter((s) => s.status === "scheduled");

  const invoices = await db.select().from(invoicesTable);
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const platformCommission = invoices.reduce((sum, inv) => sum + inv.platformCommission, 0);

  const studentCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(eq(usersTable.role, "student"));

  const freeSessions = sessions.filter((s) => (s as { isCommissionFree?: boolean }).isCommissionFree).length;
  const commissionRevenueLost = invoices
    .filter((inv) => inv.commissionRate === 0)
    .reduce((sum, inv) => sum + inv.totalAmount * 0.3, 0);

  res.json({
    totalUsers: userCount.count,
    totalTutors: tutorCount.count,
    approvedTutors: approvedCount.count,
    totalStudents: studentCount[0].count,
    totalSessions: sessions.length,
    completedSessions: completedSessions.length,
    scheduledSessions: scheduledSessions.length,
    totalRevenue,
    platformCommission,
    freeSessions,
    commissionRevenueLost,
  });
});

router.get("/admin/commission-stats", async (_req, res) => {
  const invoices = await db.select().from(invoicesTable);

  const freeInvoices = invoices.filter((inv) => inv.commissionRate === 0);
  const firstStudentFree = freeInvoices.filter((inv) => inv.commissionTier === "first_student_free");
  const firstSessionFree = freeInvoices.filter((inv) => inv.commissionTier === "first_session_free");
  const tierBreakdown = {
    standard: invoices.filter((inv) => inv.commissionTier === "standard").length,
    growth: invoices.filter((inv) => inv.commissionTier === "growth").length,
    established: invoices.filter((inv) => inv.commissionTier === "established").length,
    expert: invoices.filter((inv) => inv.commissionTier === "expert").length,
  };

  const totalPlatformEarned = invoices.reduce((s, inv) => s + inv.platformCommission, 0);
  const totalWaived = freeInvoices.reduce((s, inv) => s + inv.totalAmount * 0.3, 0);

  res.json({
    totalFreeSessionsGranted: freeInvoices.length,
    firstStudentFreeCount: firstStudentFree.length,
    firstSessionFreeCount: firstSessionFree.length,
    tierBreakdown,
    totalPlatformEarned,
    totalWaived,
  });
});

export default router;
