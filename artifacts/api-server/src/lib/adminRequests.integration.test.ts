// Explicit development-only opt-in. No Railway data or external email delivery.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { eq, inArray, sql } from "drizzle-orm";
import {
  db, usersTable, tutorsTable, accountReapplicationsTable, accountDeletionRequestsTable,
} from "@workspace/db";
import { ListAdminUserRequestsResponse } from "@workspace/api-zod";
import { issueAccessToken } from "./authTokens";

test("development unified admin requests API", { skip: process.env.RUN_ADMIN_REQUESTS_INTEGRATION !== "1" }, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const ids: number[] = [];
  const suffix = randomUUID().slice(0, 12);
  const passwordHash = await bcrypt.hash(randomUUID(), 4);
  const user = async (role: "parent" | "tutor" | "admin", options: Partial<typeof usersTable.$inferInsert> = {}) => {
    const [row] = await db.insert(usersTable).values({
      email: `requests-${suffix}-${ids.length}@example.test`, passwordHash,
      firstName: "Synthetic", lastName: "Requests", role, parentApproved: true, ...options,
    }).returning();
    ids.push(row.id);
    return row;
  };
  const call = async (path = "/admin/user-requests", token?: string, method = "GET", body?: unknown) => {
    const res = await fetch(`http://localhost:80/api${path}`, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, cacheControl: res.headers.get("cache-control"), body: await res.json() as any };
  };
  try {
    const admin = await user("admin"), regular = await user("parent");
    const adminToken = await issueAccessToken(admin.id), parentToken = await issueAccessToken(regular.id);
    const reapply = await user("parent", { isActive: false });
    const unverified = await user("parent", { isActive: false });
    const archived = await user("parent", { isActive: false, archivedAt: new Date() });
    const stale = await user("parent");
    const parent = await user("parent", { parentApproved: false });
    const tutor = await user("tutor"), qualified = await user("tutor"), inactiveTutor = await user("tutor", { isActive: false });
    for (const [u, verifiedAt] of [[reapply, new Date("2026-02-01")], [unverified, null], [archived, new Date()], [stale, new Date()]] as const) {
      await db.insert(accountReapplicationsTable).values({
        userId: u.id, passwordHash, expiresAt: new Date("2030-01-01"), verifiedAt,
      });
    }
    const [pendingTutor] = await db.insert(tutorsTable).values({ userId: tutor.id, verificationStatus: "pending" }).returning();
    await db.insert(tutorsTable).values({ userId: inactiveTutor.id, verificationStatus: "pending" });
    const [qualification] = await db.insert(tutorsTable).values({
      userId: qualified.id, isApproved: true, verificationStatus: "verified",
      educationReviewStatus: "pending", educationSubmittedAt: new Date("2026-01-01"),
    }).returning();
    const [removal] = await db.insert(accountDeletionRequestsTable).values({ userId: regular.id, reason: "Synthetic priority check" }).returning();
    await db.insert(accountDeletionRequestsTable).values({ userId: parent.id, status: "rejected" });

    await t.test("anonymous, non-admin and forged bearer identities cannot read the queue", async () => {
      assert.equal((await call()).status, 401);
      assert.equal((await call(undefined, parentToken)).status, 403);
      assert.equal((await call(undefined, Buffer.from(`${admin.id}:${Date.now()}`).toString("base64"))).status, 401);
    });
    await t.test("queue includes every supported pending request and validates against the contract", async () => {
      const response = await call(undefined, adminToken);
      assert.equal(response.status, 200);
      assert.equal(response.cacheControl, "no-store");
      assert.ok(ListAdminUserRequestsResponse.safeParse(response.body).success);
      const rows = response.body.filter((r: any) => ids.includes(r.userId));
      assert.deepEqual(rows.map((r: any) => r.kind), ["removal", "reapplication", "qualification_update", "parent_approval", "tutor_verification"]);
      assert.equal(rows.find((r: any) => r.kind === "removal").resourceId, removal.id);
      assert.equal(rows.find((r: any) => r.kind === "tutor_verification").resourceId, pendingTutor.id);
      assert.equal(rows.find((r: any) => r.kind === "qualification_update").resourceId, qualification.id);
      for (const r of rows) {
        assert.ok(!["passwordHash", "otpHash", "otp", "token"].some((key) => key in r));
      }
    });
    await t.test("unverified, archived, active stale reapplications and inactive tutors are excluded", async () => {
      const { body } = await call(undefined, adminToken);
      for (const u of [unverified, archived, stale, inactiveTutor]) assert.ok(!body.some((r: any) => r.userId === u.id));
    });
    await t.test("admin flags and approval consume the verified reapplication and remove its queue item", async () => {
      const before = await call(`/admin/users/${reapply.id}`, adminToken);
      assert.ok(before.body.reapplicationRequestedAt);
      const approved = await call(`/admin/users/${reapply.id}/status`, adminToken, "PATCH", { isActive: true });
      assert.equal(approved.status, 200);
      assert.ok(!(await call(undefined, adminToken)).body.some((r: any) => r.userId === reapply.id));
      const [row] = await db.select().from(usersTable).where(eq(usersTable.id, reapply.id));
      assert.equal(row.isActive, true);
      assert.equal(row.authVersion, 1);
    });
    await t.test("stale admin tokens lose queue access immediately after deactivation", async () => {
      await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, admin.id));
      assert.equal((await call(undefined, adminToken)).status, 401);
    });
  } finally {
    if (ids.length) {
      await db.delete(accountReapplicationsTable).where(inArray(accountReapplicationsTable.userId, ids));
      await db.update(accountDeletionRequestsTable).set({
        status: "rejected", reviewedAt: new Date(), reviewNotes: "Synthetic request-queue fixture cleanup",
      }).where(sql`${accountDeletionRequestsTable.userId} = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::integer[]) AND ${accountDeletionRequestsTable.status} = 'pending'`);
      await db.update(usersTable).set({ isActive: false, authVersion: sql`${usersTable.authVersion}+1` }).where(inArray(usersTable.id, ids));
    }
  }
});
