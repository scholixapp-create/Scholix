import { Router } from "express";
import { db, usersTable, tutorsTable, sessionsTable, invoicesTable, studentsTable, tutorRelationshipsTable, parentInformationRequestsTable, adminUserActionsTable, accountReapplicationsTable, accountDeletionRequestsTable, notificationsTable } from "@workspace/db";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import {
  AdminListUsersQueryParams,
  AdminListUsersResponse,
  GetAdminUserParams,
  GetAdminUserResponse,
  UpdateAdminUserStatusBody,
  UpdateAdminUserStatusParams,
  UpdateAdminUserStatusResponse,
  UpdateTutorCommissionWaiverBody,
  UpdateTutorCommissionWaiverParams,
  UpdateTutorCommissionWaiverResponse,
  CreateAdminParentInformationRequestParams,
  CreateAdminParentInformationRequestBody,
  CreateAdminParentInformationRequestResponse,
  CloseAdminParentInformationRequestParams,
  CloseAdminParentInformationRequestResponse,
} from "@workspace/api-zod";
import { requireAdmin, type AuthRequest } from "../lib/authMiddleware";
import { AdminUserStatusError, changeAdminUserStatus } from "../lib/adminUserManagement";
import { adminUserStatusStore } from "../lib/adminUserManagementStore";
import { AdminUserDeletionError, deleteAdminUser } from "../lib/adminUserDeletion";
import { adminUserDeletionStore } from "../lib/adminUserDeletionStore";
import { getEmailServiceStatus } from "../lib/email";
import { verifyAdminSensitiveActionPassword } from "../lib/adminSensitiveActionReauth";
import { isSafeAdminAuditReason } from "../lib/adminAuditReason";
import { CommissionWaiverError, changeTutorCommissionWaiver } from "../lib/adminCommissionWaiver";
import { adminCommissionWaiverStore } from "../lib/adminCommissionWaiverStore";
import { parentInformationRequestedEmailHtml, sendEmail } from "../lib/email";
import { config } from "../lib/config";
import { parentIntakeIssues } from "../lib/parentSignup";

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
  archivedAt: usersTable.archivedAt,
  deletionRequestedAt: sql<Date | null>`(SELECT min(adr.requested_at) FROM account_deletion_requests adr WHERE adr.user_id = "users"."id" AND adr.status = 'pending')`,
  parentApproved: usersTable.parentApproved,
  reapplicationRequestedAt: sql<Date | null>`(SELECT ar.verified_at FROM account_reapplications ar WHERE ar.user_id = "users"."id")`,
  tutorVerificationStatus: sql<string | null>`(
    SELECT t.verification_status
    FROM tutors t
    WHERE t.user_id = "users"."id"
    ORDER BY t.id
    LIMIT 1
  )`,
  tutorApproved: sql<boolean | null>`(
    SELECT t.is_approved
    FROM tutors t
    WHERE t.user_id = "users"."id"
    ORDER BY t.id
    LIMIT 1
  )`,
  studentIdentityVerified: sql<boolean | null>`(
    SELECT s.is_identity_verified
    FROM students s
    WHERE s.user_id = "users"."id"
    ORDER BY s.id
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
  archivedAt: Date | null;
  deletionRequestedAt: Date | null;
  parentApproved: boolean;
  reapplicationRequestedAt: Date | null;
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
    archivedAt: row.archivedAt,
    deletionRequestedAt: row.deletionRequestedAt,
    parentApproved: row.parentApproved,
    reapplicationRequestedAt: row.reapplicationRequestedAt,
    verificationStatus: row.tutorVerificationStatus,
    tutorApproved: row.tutorApproved,
    studentIdentityVerified: row.studentIdentityVerified,
  };
}

router.post("/admin/users/:userId/approve-parent", async (req, res): Promise<void> => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0 || userId > 2147483647) {
    res.status(400).json({ error: "Invalid user ID" }); return;
  }
  const result = await db.transaction(async (tx) => {
    const [target] = await tx.select().from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1).for("update");
    if (!target || target.role !== "parent" || !target.isActive || target.parentApproved) return { kind: "unavailable" as const };
    const students = await tx.select({
      firstName: studentsTable.firstName,
      lastName: studentsTable.lastName,
      yearLevel: studentsTable.gradeLevel,
      address: studentsTable.address,
    }).from(studentsTable)
      .where(and(eq(studentsTable.parentId, userId), isNull(studentsTable.archivedAt)));
    const intakeIssues = parentIntakeIssues({
      parentAddress: target.address ?? undefined,
      signupIntent: target.signupIntent ?? undefined,
      signupIntentDetails: target.signupIntentDetails ?? undefined,
      knownTutorName: target.knownTutorName ?? undefined,
      students: students.map((student) => ({
        firstName: student.firstName,
        lastName: student.lastName ?? "",
        yearLevel: student.yearLevel ?? "",
        address: student.address ?? "",
      })),
    });
    if (intakeIssues.length) return { kind: "incomplete" as const, issues: intakeIssues };
    await tx.update(usersTable).set({ parentApproved: true }).where(eq(usersTable.id, userId));
    await tx.insert(adminUserActionsTable).values({
      actorUserId: (req as unknown as AuthRequest).user.id,
      targetUserId: target.id, targetEmail: target.email, action: "parent_approved",
    });
    return { kind: "approved" as const };
  });
  if (result.kind === "unavailable") {
    res.status(409).json({ error: "Only an active parent awaiting approval can be approved" });
    return;
  }
  if (result.kind === "incomplete") {
    res.status(409).json({
      error: "Complete the parent contact address, signup reason, and every active student's profile and lesson address before approval.",
      missingFields: result.issues,
    });
    return;
  }
  res.json(await findAdminUser(userId));
});

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
  const parentDetails = user.role === "parent" ? await getAdminParentDetails(user.id) : null;
  res.set("Cache-Control", "no-store");
  res.json(GetAdminUserResponse.parse({ ...user, parentDetails }));
});

async function getAdminParentDetails(parentId: number) {
  const [parent] = await db.select({
    phone: usersTable.phone,
    address: usersTable.address,
    signupIntent: usersTable.signupIntent,
    signupIntentDetails: usersTable.signupIntentDetails,
    knownTutorName: usersTable.knownTutorName,
  }).from(usersTable).where(eq(usersTable.id, parentId)).limit(1);
  if (!parent) return null;

  const [students, relationshipTutors, sessionTutors, informationRequests] = await Promise.all([
    db.select({
      id: studentsTable.id,
      firstName: studentsTable.firstName,
      lastName: studentsTable.lastName,
      yearLevel: studentsTable.gradeLevel,
      school: studentsTable.school,
      subjects: studentsTable.subjects,
      goals: studentsTable.goals,
      address: studentsTable.address,
      dateOfBirth: studentsTable.dateOfBirth,
      archivedAt: studentsTable.archivedAt,
      isIdentityVerified: studentsTable.isIdentityVerified,
      createdAt: studentsTable.createdAt,
    }).from(studentsTable).where(eq(studentsTable.parentId, parentId)).orderBy(desc(studentsTable.createdAt)),
    db.select({
      tutorId: tutorsTable.id,
      userId: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      isActive: usersTable.isActive,
      isApproved: tutorsTable.isApproved,
      subjects: tutorsTable.subjects,
    }).from(tutorRelationshipsTable)
      .innerJoin(tutorsTable, eq(tutorRelationshipsTable.tutorId, tutorsTable.id))
      .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
      .where(eq(tutorRelationshipsTable.parentId, parentId)),
    db.select({
      tutorId: tutorsTable.id,
      userId: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      isActive: usersTable.isActive,
      isApproved: tutorsTable.isApproved,
      subjects: tutorsTable.subjects,
    }).from(sessionsTable)
      .innerJoin(studentsTable, eq(sessionsTable.studentId, studentsTable.id))
      .innerJoin(tutorsTable, eq(sessionsTable.tutorId, tutorsTable.id))
      .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
      .where(eq(studentsTable.parentId, parentId)),
    db.select().from(parentInformationRequestsTable)
      .where(eq(parentInformationRequestsTable.parentUserId, parentId))
      .orderBy(desc(parentInformationRequestsTable.requestedAt)),
  ]);

  const tutorById = new Map<number, (typeof relationshipTutors)[number]>();
  for (const tutor of [...relationshipTutors, ...sessionTutors]) tutorById.set(tutor.tutorId, tutor);
  const intakeIssues = parentIntakeIssues({
    parentAddress: parent.address ?? undefined,
    signupIntent: parent.signupIntent ?? undefined,
    signupIntentDetails: parent.signupIntentDetails ?? undefined,
    knownTutorName: parent.knownTutorName ?? undefined,
    students: students.filter((student) => !student.archivedAt).map((student) => ({
      firstName: student.firstName,
      lastName: student.lastName ?? "",
      yearLevel: student.yearLevel ?? "",
      address: student.address ?? "",
    })),
  });
  return {
    phone: parent.phone ?? null,
    address: parent.address ?? null,
    signupIntent: parent.signupIntent ?? null,
    signupIntentDetails: parent.signupIntentDetails ?? null,
    knownTutorName: parent.knownTutorName ?? null,
    intakeComplete: intakeIssues.length === 0,
    intakeIssues,
    students: students.map((student) => ({
      ...student,
      lastName: student.lastName ?? null,
      yearLevel: student.yearLevel ?? null,
      school: student.school ?? null,
      subjects: student.subjects ?? null,
      goals: student.goals ?? null,
      address: student.address ?? null,
      dateOfBirth: student.dateOfBirth ?? null,
      isIdentityVerified: student.isIdentityVerified ?? false,
    })),
    connectedTutors: [...tutorById.values()].map((tutor) => ({
      id: tutor.tutorId,
      userId: tutor.userId,
      firstName: tutor.firstName,
      lastName: tutor.lastName,
      email: tutor.email,
      isActive: tutor.isActive,
      isApproved: tutor.isApproved,
      subjects: Array.isArray(tutor.subjects) ? tutor.subjects.join(", ") : tutor.subjects ?? null,
    })),
    informationRequests: informationRequests.map((request) => ({
      ...request,
      parentUserId: request.parentUserId ?? null,
      responseText: request.responseText ?? null,
      respondedAt: request.respondedAt ?? null,
      closedAt: request.closedAt ?? null,
    })),
  };
}

router.post("/admin/users/:userId/information-requests", async (req, res): Promise<void> => {
  const params = CreateAdminParentInformationRequestParams.safeParse(req.params);
  const body = CreateAdminParentInformationRequestBody.safeParse(req.body);
  if (!params.success || !body.success || !body.data.requestText.trim()) {
    res.status(400).json({ error: "Enter a valid information request" });
    return;
  }

  const actor = (req as unknown as AuthRequest).user;
  const created = await db.transaction(async (tx) => {
    const [parent] = await tx.select().from(usersTable)
      .where(eq(usersTable.id, params.data.userId)).limit(1).for("update");
    if (!parent || parent.role !== "parent" || !parent.isActive || parent.archivedAt) return null;
    const [request] = await tx.insert(parentInformationRequestsTable).values({
      parentUserId: parent.id,
      targetUserId: parent.id,
      parentEmail: parent.email,
      adminUserId: actor.id,
      requestText: body.data.requestText.trim(),
    }).returning();
    await tx.insert(adminUserActionsTable).values({
      actorUserId: actor.id,
      targetUserId: parent.id,
      targetEmail: parent.email,
      action: "parent_information_requested",
    });
    await tx.insert(notificationsTable).values({
      userId: parent.id,
      type: "parent_information_requested",
      title: "Scholix needs more information",
      message: "An administrator has asked you for additional information. Sign in to review and reply.",
      actionUrl: "/parent/information-requests",
      actionLabel: "Review request",
    });
    return { request, firstName: parent.firstName };
  });
  if (!created) {
    res.status(404).json({ error: "Active parent account not found" });
    return;
  }

  const email = await sendEmail({
    to: created.request.parentEmail,
    subject: "Scholix needs more information",
    html: parentInformationRequestedEmailHtml({
      recipientName: created.firstName,
      requestText: created.request.requestText,
      actionUrl: `${config.frontendUrl.replace(/\/+$/, "")}/parent/information-requests`,
    }),
  });
  if (!email.delivered && !email.devMode) {
    req.log.warn({ requestId: created.request.id }, "Parent information request saved with in-app alert, but email delivery failed");
  }
  res.set("Cache-Control", "no-store");
  res.status(201).json(CreateAdminParentInformationRequestResponse.parse(created.request));
});

router.patch("/admin/parent-information-requests/:requestId/close", async (req, res): Promise<void> => {
  const params = CloseAdminParentInformationRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid information request ID" });
    return;
  }
  const actor = (req as unknown as AuthRequest).user;
  const closed = await db.transaction(async (tx) => {
    const [request] = await tx.select().from(parentInformationRequestsTable)
      .where(eq(parentInformationRequestsTable.id, params.data.requestId)).limit(1).for("update");
    if (!request || request.status !== "responded") return null;
    const [updated] = await tx.update(parentInformationRequestsTable)
      .set({ status: "closed", closedAt: new Date() })
      .where(eq(parentInformationRequestsTable.id, request.id))
      .returning();
    await tx.insert(adminUserActionsTable).values({
      actorUserId: actor.id,
      targetUserId: request.targetUserId,
      targetEmail: request.parentEmail,
      action: "parent_information_closed",
    });
    return updated;
  });
  if (!closed) {
    res.status(409).json({ error: "Only a responded information request can be closed" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json(CloseAdminParentInformationRequestResponse.parse(closed));
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

router.patch("/admin/tutors/:tutorId/commission-waiver", async (req, res): Promise<void> => {
  const params = UpdateTutorCommissionWaiverParams.safeParse(req.params);
  const body = UpdateTutorCommissionWaiverBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid commission waiver request" });
    return;
  }
  if (!isSafeAdminAuditReason(body.data.reason, body.data.currentPassword)) {
    res.status(400).json({ error: "The reason must not contain passwords, tokens, or verification codes" });
    return;
  }

  const actor = (req as unknown as AuthRequest).user;
  const reauth = await verifyAdminSensitiveActionPassword(
    actor.id,
    body.data.currentPassword,
  );
  if (reauth.status === "locked") {
    res.status(429).json({ error: "Too many incorrect password attempts. Wait 15 minutes before retrying." });
    return;
  }
  if (reauth.status === "not_admin") {
    res.status(403).json({ error: "Active admin access is required" });
    return;
  }
  if (reauth.status === "invalid") {
    req.log.warn({ adminUserId: actor.id, tutorId: params.data.tutorId }, "Sensitive commission action password verification failed");
    res.status(403).json({ error: "Current password could not be verified" });
    return;
  }

  try {
    const result = await changeTutorCommissionWaiver(adminCommissionWaiverStore, {
      actorUserId: actor.id,
      tutorId: params.data.tutorId,
      enabled: body.data.enabled,
      reason: body.data.reason,
      confirmationEmail: body.data.confirmationEmail,
    });
    res.json(UpdateTutorCommissionWaiverResponse.parse(result));
  } catch (error) {
    if (error instanceof CommissionWaiverError) {
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
