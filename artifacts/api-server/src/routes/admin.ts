import { Router } from "express";
import { db, usersTable, tutorsTable, sessionsTable, invoicesTable, studentsTable } from "@workspace/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  AdminListUsersQueryParams,
  AdminListUsersResponse,
  GetAdminUserParams,
  GetAdminUserResponse,
  UpdateAdminUserStatusBody,
  UpdateAdminUserStatusParams,
  UpdateAdminUserStatusResponse,
} from "@workspace/api-zod";
import { requireAdmin, type AuthRequest } from "../lib/authMiddleware";
import { AdminUserStatusError, changeAdminUserStatus } from "../lib/adminUserManagement";
import { adminUserStatusStore } from "../lib/adminUserManagementStore";
import { AdminUserDeletionError, deleteAdminUser } from "../lib/adminUserDeletion";
import { adminUserDeletionStore } from "../lib/adminUserDeletionStore";
import { getEmailServiceStatus } from "../lib/email";

const router = Router();

// Only guard actual /admin/* paths — skip this router for other paths
router.use((req, res, next) => {
  if (!req.path.startsWith("/admin")) return next("router");
  return requireAdmin(req, res, next);
});

async function findAdminUser(userId: number) {
  const [row] = await db
    .select(adminUserSelection)
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!row) return undefined;
  return toAdminUser(row);
}

const adminUserSelection = {
  id: usersTable.id,
  email: usersTable.email,
  firstName: usersTable.firstName,
  lastName: usersTable.lastName,
  role: usersTable.role,
  createdAt: usersTable.createdAt,
  isActive: usersTable.isActive,
  tutorVerificationStatus: sql<string | null>`(
    SELECT ${tutorsTable.verificationStatus}
    FROM ${tutorsTable}
    WHERE ${tutorsTable.userId} = ${usersTable.id}
    ORDER BY ${tutorsTable.id}
    LIMIT 1
  )`,
  tutorApproved: sql<boolean | null>`(
    SELECT ${tutorsTable.isApproved}
    FROM ${tutorsTable}
    WHERE ${tutorsTable.userId} = ${usersTable.id}
    ORDER BY ${tutorsTable.id}
    LIMIT 1
  )`,
  studentIdentityVerified: sql<boolean | null>`(
    SELECT ${studentsTable.isIdentityVerified}
    FROM ${studentsTable}
    WHERE ${studentsTable.userId} = ${usersTable.id}
    ORDER BY ${studentsTable.id}
    LIMIT 1
  )`,
};

type AdminUserRow = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "tutor" | "parent" | "student" | "admin";
  createdAt: Date;
  isActive: boolean;
  tutorVerificationStatus: string | null;
  tutorApproved: boolean | null;
  studentIdentityVerified: boolean | null;
};

function toAdminUser(row: AdminUserRow) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    createdAt: row.createdAt,
    isActive: row.isActive,
    verificationStatus: row.tutorVerificationStatus,
    tutorApproved: row.tutorApproved,
    studentIdentityVerified: row.studentIdentityVerified,
  };
}

router.get("/admin/users", async (req, res): Promise<void> => {
  const parsed = AdminListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid search query" });
    return;
  }

  const search = parsed.data.search?.trim();
  const rows = await db
    .select(adminUserSelection)
    .from(usersTable)
    .where(search
      ? or(
          ilike(usersTable.email, `%${search}%`),
          ilike(usersTable.firstName, `%${search}%`),
          ilike(usersTable.lastName, `%${search}%`),
        )
      : undefined)
    .orderBy(desc(usersTable.createdAt), desc(usersTable.id));

  const users = rows.map(toAdminUser);
  res.json(AdminListUsersResponse.parse(users));
});

router.get("/admin/users/:userId", async (req, res): Promise<void> => {
  const params = GetAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const user = await findAdminUser(params.data.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetAdminUserResponse.parse(user));
});

router.delete("/admin/users/:userId", async (req, res): Promise<void> => {
  const params = GetAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  try {
    const actorId = (req as unknown as AuthRequest).user.id;
    await deleteAdminUser(adminUserDeletionStore, actorId, params.data.userId);
    res.sendStatus(204);
  } catch (error) {
    if (error instanceof AdminUserDeletionError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.patch("/admin/users/:userId/status", async (req, res): Promise<void> => {
  const params = UpdateAdminUserStatusParams.safeParse(req.params);
  const body = UpdateAdminUserStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid status update" });
    return;
  }

  try {
    const actorId = (req as unknown as AuthRequest).user.id;
    await changeAdminUserStatus(
      adminUserStatusStore,
      actorId,
      params.data.userId,
      body.data.isActive,
    );

    const user = await findAdminUser(params.data.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(UpdateAdminUserStatusResponse.parse(user));
  } catch (error) {
    if (error instanceof AdminUserStatusError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    throw error;
  }
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

router.get("/admin/email-status", (_req, res) => {
  res.json(getEmailServiceStatus());
});

export default router;
