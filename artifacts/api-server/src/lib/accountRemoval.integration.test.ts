// Explicit opt-in: runs against the local API/development database, never Railway.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  db, usersTable, studentsTable, tutorsTable, sessionsTable,
  accountDeletionRequestsTable, accountLifecycleActionsTable,
} from "@workspace/db";
import { issueAccessToken } from "./authTokens";

test("development account-removal API integration", {
  skip: process.env.RUN_ACCOUNT_REMOVAL_INTEGRATION !== "1",
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const suffix = randomUUID().slice(0, 12);
  const ids: number[] = [];
  const passwordHash = await bcrypt.hash(randomUUID(), 4);
  const user = async (role: "parent" | "admin" | "student" | "tutor") => {
    const [row] = await db.insert(usersTable).values({
      email: `family-${role}-${suffix}-${ids.length}@example.test`, passwordHash,
      firstName: "Synthetic", lastName: "Removal", role, parentApproved: true,
    }).returning();
    ids.push(row.id);
    return { ...row, token: await issueAccessToken(row.id) };
  };
  const request = async (path: string, token?: string, method = "GET", body?: unknown) => {
    const response = await fetch(`http://localhost:80/api${path}`, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json().catch(() => ({})) as any };
  };
  try {
    const admin = await user("admin"), parent = await user("parent"), other = await user("parent");
    const childUser = await user("student"), tutorUser = await user("tutor");
    const [tutor] = await db.insert(tutorsTable).values({ userId: tutorUser.id, isApproved: true, verificationStatus: "verified" }).returning();
    const [child] = await db.insert(studentsTable).values({ firstName: "Retained", lastName: "Child", userId: childUser.id, parentId: parent.id, isIdentityVerified: true, dateOfBirth: "2012-01-01" }).returning();
    const [unused] = await db.insert(studentsTable).values({ firstName: "Unused", lastName: "Child", parentId: parent.id }).returning();
    const [history] = await db.insert(sessionsTable).values({
      tutorId: tutor.id, studentId: child.id, subject: "Synthetic history",
      status: "completed", scheduledAt: new Date("2026-01-01T10:00:00Z"), totalAmount: 65, isPaid: true,
    }).returning();
    const [upcoming] = await db.insert(sessionsTable).values({
      tutorId: tutor.id, studentId: child.id, subject: "Synthetic scheduled",
      status: "scheduled", scheduledAt: new Date("2030-01-01T10:00:00Z"),
    }).returning();
    await t.test("anonymous and non-admin cannot read deletion requests", async () => {
      assert.equal((await request("/admin/deletion-requests")).status, 401);
      assert.equal((await request("/admin/deletion-requests", parent.token)).status, 403);
    });
    await t.test("cross-parent reads, changes and removal are rejected", async () => {
      assert.equal((await request(`/students/${child.id}`, other.token)).status, 403);
      assert.equal((await request(`/students/${child.id}`, other.token, "PATCH", { firstName: "Hijacked" })).status, 403);
      assert.equal((await request(`/students/${child.id}`, other.token, "DELETE", { confirmationName: "Retained Child" })).status, 403);
      const rows = await request("/students", other.token);
      assert.ok(!rows.body.some((s: { id: number }) => s.id === child.id));
      assert.equal((await request(`/tutors/${tutor.id}/students`, other.token)).status, 403);
    });
    await t.test("editing cannot change ownership, role or verification claims", async () => {
      for (const body of [{ parentId: other.id }, { userId: other.id }, { role: "admin" }, { isIdentityVerified: true }]) {
        assert.equal((await request(`/students/${child.id}`, parent.token, "PATCH", body)).status, 400);
      }
      assert.equal((await request(`/students/${child.id}`, parent.token, "PATCH", { dateOfBirth: "2026-02-30" })).status, 400);
      const edited = await request(`/students/${child.id}`, parent.token, "PATCH", { school: "Synthetic School", goals: "Practice", dateOfBirth: "2012-02-02" });
      assert.equal(edited.status, 200);
      assert.equal(edited.body.school, "Synthetic School");
      assert.equal(edited.body.isIdentityVerified, false);
    });
    await t.test("unresolved lessons and wrong confirmations do not remove a child", async () => {
      assert.equal((await request(`/students/${child.id}`, parent.token, "DELETE", { confirmationName: "Wrong" })).status, 400);
      assert.equal((await request(`/students/${child.id}`, parent.token, "DELETE", { confirmationName: "Retained Child" })).status, 409);
      assert.equal((await request(`/students/${child.id}`, parent.token)).status, 200);
    });
    await t.test("unused profile is permanently removed and audit evidence survives", async () => {
      const result = await request(`/students/${unused.id}`, parent.token, "DELETE", { confirmationName: "Unused Child" });
      assert.equal(result.status, 200);
      assert.equal(result.body.archived, false);
      assert.equal((await db.select().from(studentsTable).where(eq(studentsTable.id, unused.id))).length, 0);
      assert.equal((await db.select().from(accountLifecycleActionsTable).where(and(eq(accountLifecycleActionsTable.studentId, unused.id), eq(accountLifecycleActionsTable.action, "student_removed")))).length, 1);
    });
    let deletionId: number;
    await t.test("concurrent deletion requests create one pending queue entry", async () => {
      const results = await Promise.all([1, 2].map(() => request("/auth/request-deletion", parent.token, "POST", { reason: "Synthetic family removal" })));
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      const queue = await request("/admin/deletion-requests", admin.token);
      const pending = queue.body.filter((r: { userId: number; status: string }) => r.userId === parent.id && r.status === "pending");
      assert.equal(pending.length, 1); deletionId = pending[0].id;
      const users = await request("/admin/users", admin.token);
      assert.ok(users.body.find((u: { id: number }) => u.id === parent.id).deletionRequestedAt);
    });
    await t.test("non-admin and wrong target confirmations cannot approve family removal", async () => {
      assert.equal((await request(`/admin/deletion-requests/${deletionId}`, other.token, "PATCH", { decision: "approve", confirmationEmail: parent.email })).status, 403);
      assert.equal((await request(`/admin/deletion-requests/${deletionId}`, admin.token, "PATCH", { decision: "approve", confirmationEmail: other.email })).status, 400);
      assert.equal((await request(`/admin/deletion-requests/${deletionId}`, admin.token, "PATCH", { decision: "approve", confirmationEmail: parent.email })).status, 409);
    });
    await db.update(sessionsTable).set({ status: "cancelled" }).where(eq(sessionsTable.id, upcoming.id));
    await t.test("one concurrent approval wins and archives parent and child with intact history", async () => {
      const results = await Promise.all([1, 2].map(() => request(`/admin/deletion-requests/${deletionId}`, admin.token, "PATCH", { decision: "approve", confirmationEmail: parent.email, notes: "Synthetic approval" })));
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      const [retained] = await db.select().from(studentsTable).where(eq(studentsTable.id, child.id));
      assert.ok(retained.archivedAt);
      assert.ok((await db.select().from(sessionsTable).where(eq(sessionsTable.id, history.id)))[0]);
      assert.equal((await request("/auth/me", parent.token)).status, 401);
      assert.equal((await request("/auth/me", childUser.token)).status, 401);
      assert.equal((await request(`/students/${child.id}`, tutorUser.token)).status, 404);
      assert.equal((await request(`/students/${child.id}/progress`, tutorUser.token)).status, 404);
      assert.equal((await request(`/sessions/${history.id}/progress`, tutorUser.token)).status, 403);
      assert.ok(!(await request(`/tutors/${tutor.id}/students`, tutorUser.token)).body.some((s: { id: number }) => s.id === child.id));
      assert.equal((await request(`/admin/users/${parent.id}/status`, admin.token, "PATCH", { isActive: true })).status, 409);
      assert.equal((await db.select().from(accountLifecycleActionsTable).where(and(eq(accountLifecycleActionsTable.requestId, deletionId), eq(accountLifecycleActionsTable.action, "family_archived")))).length, 1);
    });
    await t.test("audit is append-only", async () => {
      await assert.rejects(db.execute(sql`DELETE FROM account_lifecycle_actions WHERE target_user_id = ${parent.id}`), /append-only|Failed query/);
    });
    await t.test("rejection records outcome without disabling account", async () => {
      const [pending] = await db.insert(accountDeletionRequestsTable).values({ userId: other.id }).returning();
      const result = await request(`/admin/deletion-requests/${pending.id}`, admin.token, "PATCH", { decision: "reject", confirmationEmail: other.email, notes: "Synthetic rejection" });
      assert.equal(result.status, 200);
      assert.equal((await request("/auth/me", other.token)).status, 200);
      assert.equal((await db.select().from(accountDeletionRequestsTable).where(eq(accountDeletionRequestsTable.id, pending.id)))[0].reviewNotes, "Synthetic rejection");
    });
    await t.test("admin requests cannot remove self or another administrator", async () => {
      const [selfRequest] = await db.insert(accountDeletionRequestsTable).values({ userId: admin.id }).returning();
      assert.equal((await request(`/admin/deletion-requests/${selfRequest.id}`, admin.token, "PATCH", { decision: "approve", confirmationEmail: admin.email })).status, 409);
      const otherAdmin = await user("admin");
      assert.equal((await request(`/admin/deletion-requests/${selfRequest.id}`, otherAdmin.token, "PATCH", { decision: "approve", confirmationEmail: admin.email })).status, 409);
    });
  } finally {
    // Retain test business/audit evidence, but leave no active test identities.
    if (ids.length) {
      await db.update(accountDeletionRequestsTable).set({
        status: "rejected", reviewedAt: new Date(), reviewNotes: "Synthetic integration-test fixture cleanup",
      }).where(and(inArray(accountDeletionRequestsTable.userId, ids), eq(accountDeletionRequestsTable.status, "pending")));
      await db.update(usersTable).set({ isActive: false, authVersion: sql`${usersTable.authVersion} + 1` }).where(inArray(usersTable.id, ids));
    }
  }
});
