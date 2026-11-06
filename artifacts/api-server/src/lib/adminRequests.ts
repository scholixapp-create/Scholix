import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import {
  db, usersTable, tutorsTable, accountDeletionRequestsTable, accountReapplicationsTable,
} from "@workspace/db";

export type RequestKind = "removal" | "reapplication" | "parent_approval" | "tutor_verification" | "qualification_update";
export type RequestPriority = "urgent" | "high" | "normal";
export const requestPriority: Record<RequestKind, RequestPriority> = {
  removal: "urgent",
  reapplication: "high",
  parent_approval: "normal",
  tutor_verification: "normal",
  qualification_update: "normal",
};
const ranks = { urgent: 0, high: 1, normal: 2 };
export function orderUserRequests<T extends { id: string; priority: RequestPriority; requestedAt: Date }>(requests: T[]): T[] {
  return [...requests].sort((a, b) =>
    ranks[a.priority] - ranks[b.priority]
    || a.requestedAt.getTime() - b.requestedAt.getTime()
    || a.id.localeCompare(b.id));
}

// Project only identity and review metadata. Never return OTP/password material.
const identity = {
  userId: usersTable.id, email: usersTable.email, firstName: usersTable.firstName,
  lastName: usersTable.lastName, role: usersTable.role,
};
const eligible = and(eq(usersTable.isActive, true), isNull(usersTable.archivedAt));
export async function listPendingUserRequests() {
  const [removals, reapplications, parents, verification, qualifications] = await Promise.all([
    db.select({ ...identity, resourceId: accountDeletionRequestsTable.id,
      requestedAt: accountDeletionRequestsTable.requestedAt, reason: accountDeletionRequestsTable.reason })
      .from(accountDeletionRequestsTable).innerJoin(usersTable, eq(usersTable.id, accountDeletionRequestsTable.userId))
      .where(and(eq(accountDeletionRequestsTable.status, "pending"), isNull(usersTable.archivedAt),
        inArray(usersTable.role, ["parent", "tutor", "student"]))),
    db.select({ ...identity, resourceId: usersTable.id, requestedAt: accountReapplicationsTable.verifiedAt })
      .from(accountReapplicationsTable).innerJoin(usersTable, eq(usersTable.id, accountReapplicationsTable.userId))
      .where(and(eq(usersTable.isActive, false), isNull(usersTable.archivedAt),
        inArray(usersTable.role, ["parent", "tutor"]), isNotNull(accountReapplicationsTable.verifiedAt))),
    db.select({ ...identity, resourceId: usersTable.id, requestedAt: usersTable.createdAt }).from(usersTable)
      .where(and(eligible, eq(usersTable.role, "parent"), eq(usersTable.parentApproved, false))),
    db.select({ ...identity, resourceId: tutorsTable.id, requestedAt: tutorsTable.createdAt }).from(tutorsTable)
      .innerJoin(usersTable, eq(usersTable.id, tutorsTable.userId))
      .where(and(eligible, eq(usersTable.role, "tutor"), eq(tutorsTable.isApproved, false),
        inArray(tutorsTable.verificationStatus, ["pending", "pending_verification"]))),
    db.select({ ...identity, resourceId: tutorsTable.id, requestedAt: tutorsTable.educationSubmittedAt,
      createdAt: tutorsTable.createdAt }).from(tutorsTable)
      .innerJoin(usersTable, eq(usersTable.id, tutorsTable.userId))
      .where(and(eligible, eq(usersTable.role, "tutor"), eq(tutorsTable.educationReviewStatus, "pending"))),
  ]);
  const item = (kind: RequestKind, row: typeof parents[number], reason: string | null = null) => ({
    ...row, id: `${kind}:${row.resourceId}`, kind, priority: requestPriority[kind], reason,
  });
  return orderUserRequests([
    ...removals.map((r) => item("removal", r, r.reason)),
    ...reapplications.filter((r) => r.requestedAt !== null)
      .map((r) => item("reapplication", { ...r, requestedAt: r.requestedAt! })),
    ...parents.map((r) => item("parent_approval", r)),
    ...verification.map((r) => item("tutor_verification", r)),
    ...qualifications.map(({ createdAt, ...r }) =>
      item("qualification_update", { ...r, requestedAt: r.requestedAt ?? createdAt })),
  ]);
}
