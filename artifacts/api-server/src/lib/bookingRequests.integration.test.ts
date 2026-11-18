// Opt-in development API tests. Only synthetic accounts are created and removed.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import {
  db, usersTable, tutorsTable, studentsTable, sessionsTable, availabilityTable, tutorAvailabilityOverridesTable,
  paymentsTable, invoicesTable, notificationsTable, tutorRelationshipsTable, pool,
} from "@workspace/db";
import { issueAccessToken } from "./authTokens";
import { localDate, dayOfWeek, zonedInstant } from "./scheduling";

test("development booking requests, beta holds, permissions and concurrent writes", {
  skip: process.env.RUN_BOOKING_REQUESTS_INTEGRATION !== "1",
}, async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.doesNotMatch(new URL(process.env.DATABASE_URL!).hostname, /railway|rlwy\.net/i);
  const suffix = randomUUID().slice(0, 10), ids: number[] = [], tutorIds: number[] = [], childIds: number[] = [];
  const user = async (role: "parent" | "tutor" | "admin" | "student") => {
    const [row] = await db.insert(usersTable).values({
      email: `booking-${suffix}-${ids.length}@example.test`, passwordHash: "synthetic-no-login",
      firstName: "Synthetic", lastName: "Booking", role, parentApproved: true, emailNotificationsEnabled: false,
    }).returning();
    ids.push(row.id);
    return { ...row, token: await issueAccessToken(row.id) };
  };
  const call = async (path: string, token?: string, method = "GET", body?: unknown) => {
    const response = await fetch(`http://localhost:80/api${path}`, {
      method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const parent = await user("parent"), outsider = await user("parent"), tutorUser = await user("tutor");
    const wrongTutor = await user("tutor"), admin = await user("admin");
    const childUser = await user("student");
    const [tutor] = await db.insert(tutorsTable).values({
      userId: tutorUser.id, isApproved: true, verificationStatus: "verified", subjects: ["Mathematics"],
      hourlyRate: 60, teachingMode: "both", travelBufferMinutes: 15, sessionDurations: "[60,90]",
    }).returning();
    tutorIds.push(tutor.id);
    const [child] = await db.insert(studentsTable).values({
      userId: childUser.id, parentId: parent.id, firstName: "Synthetic child", email: childUser.email,
      address: "10 Synthetic Street, Melbourne VIC 3000",
    }).returning();
    const [otherChild] = await db.insert(studentsTable).values({
      parentId: outsider.id, firstName: "Other child", address: "12 Example Road, Melbourne VIC 3000",
    }).returning();
    childIds.push(child.id, otherChild.id);
    const date = localDate(new Date(Date.now() + 8 * 86_400_000));
    await db.insert(availabilityTable).values({
      tutorId: tutor.id, dayOfWeek: dayOfWeek(date), startTime: "16:00", endTime: "18:15", timezone: "Australia/Melbourne",
    });
    const [addresslessChild] = await db.insert(studentsTable).values({
      parentId: parent.id, firstName: "Addressless child",
    }).returning();
    childIds.push(addresslessChild.id);
    await db.insert(sessionsTable).values({
      tutorId: tutor.id, studentId: addresslessChild.id, subject: "Previous lesson",
      scheduledAt: new Date(Date.now() - 7 * 86_400_000), durationMinutes: 60,
      status: "completed", isPaid: false, totalAmount: 60,
    });
    const create = (time = "16:00", token = parent.token, studentId = child.id, lessonMode = "in_person") =>
      call("/sessions", token, "POST", { tutorId: tutor.id, studentId, subject: "Mathematics",
        scheduledAt: zonedInstant(date, time)!.toISOString(), durationMinutes: 60, lessonMode });
    const createFor = (time: string, studentId: number, lessonMode = "in_person") =>
      call("/sessions", parent.token, "POST", { tutorId: tutor.id, studentId, subject: "Mathematics",
        scheduledAt: zonedInstant(date, time)!.toISOString(), durationMinutes: 60, lessonMode });
    const offer = (time = "16:00", studentId = child.id, lessonMode = "in_person") =>
      call(`/tutors/${tutor.id}/offers`, tutorUser.token, "POST", { studentId, subject: "Mathematics",
        scheduledAt: zonedInstant(date, time)!.toISOString(), durationMinutes: 60, lessonMode });
    const hold = (id: number, token = parent.token) => call("/payments/simulate", token, "POST", { sessionId: id });
    const decide = (id: number, decision = "accept", token = tutorUser.token) =>
      call(`/sessions/${id}/decision`, token, "POST", { decision });
    const clearSessions = async () => {
      const rows = await db.select({ id: sessionsTable.id }).from(sessionsTable).where(eq(sessionsTable.tutorId, tutor.id));
      if (!rows.length) return;
      const sessionIds = rows.map((s) => s.id);
      await db.delete(invoicesTable).where(inArray(invoicesTable.sessionId, sessionIds));
      await db.delete(paymentsTable).where(inArray(paymentsTable.sessionId, sessionIds));
      await db.delete(sessionsTable).where(inArray(sessionsTable.id, sessionIds));
    };

    await t.test("availability ownership, modes, quarter hours and invalid inputs", async () => {
      assert.equal((await call(`/tutors/${tutor.id}/availability`, undefined, "PUT", { windows: [] })).status, 401);
      assert.equal((await call(`/tutors/${tutor.id}/availability`, parent.token, "PUT", { windows: [] })).status, 403);
      const available = await call(`/tutors/${tutor.id}/available-slots?date=${date}&duration=60&lessonMode=in_person`, parent.token);
      assert.equal(available.status, 200);
      assert.deepEqual(available.body.preferredSlots, ["16:00", "17:15"]);
      assert.ok(available.body.slots.includes("16:15"));
      assert.equal((await create("16:00", outsider.token)).status, 403);
      assert.equal((await create("15:45")).status, 409);
      assert.equal((await call(`/tutors/${tutor.id}/available-slots?date=2026-02-30&duration=60`)).status, 400);

      const followingWeekDate = new Date(`${date}T12:00:00.000Z`);
      followingWeekDate.setUTCDate(followingWeekDate.getUTCDate() + 7);
      const followingWeek = followingWeekDate.toISOString().slice(0, 10);
      const overridePath = `/tutors/${tutor.id}/availability-overrides/${date}`;
      assert.equal((await call(overridePath, undefined, "PUT", { startTime: "17:00", endTime: "20:00" })).status, 401);
      assert.equal((await call(overridePath, parent.token, "PUT", { startTime: "17:00", endTime: "20:00" })).status, 403);
      assert.equal((await call(overridePath, tutorUser.token, "PUT", { startTime: "20:00", endTime: "17:00" })).status, 400);
      assert.equal((await call(overridePath, tutorUser.token, "PUT", { startTime: "17:00", endTime: "20:00" })).status, 200);

      const publicOverrides = await call(`/tutors/${tutor.id}/availability-overrides`);
      assert.equal(publicOverrides.status, 200);
      assert.ok(publicOverrides.body.some((override: { date: string }) => override.date === date));
      const changedDaySlots = await call(`/tutors/${tutor.id}/available-slots?date=${date}&duration=60&lessonMode=in_person`, parent.token);
      assert.equal(changedDaySlots.status, 200);
      assert.ok(changedDaySlots.body.slots.length > 0);
      assert.equal(changedDaySlots.body.slots.some((time: string) => time < "17:00"), false);
      const followingWeekSlots = await call(`/tutors/${tutor.id}/available-slots?date=${followingWeek}&duration=60&lessonMode=in_person`, parent.token);
      assert.equal(followingWeekSlots.status, 200);
      assert.ok(followingWeekSlots.body.slots.includes("16:00"));
      assert.equal((await create("16:00")).status, 409);

      const validBooking = await create("17:00");
      assert.equal(validBooking.status, 201);
      await db.delete(sessionsTable).where(eq(sessionsTable.id, validBooking.body.id));
      assert.equal((await call(overridePath, tutorUser.token, "DELETE")).status, 204);
      const restoredDaySlots = await call(`/tutors/${tutor.id}/available-slots?date=${date}&duration=60&lessonMode=in_person`, parent.token);
      assert.ok(restoredDaySlots.body.slots.includes("16:00"));
    });
    await t.test("lesson addresses are requested from parents and required only for in-person bookings", async () => {
      const request = `/students/${addresslessChild.id}/address-request`;
      assert.equal((await call(request, parent.token, "POST")).status, 403);
      assert.equal((await call(request, wrongTutor.token, "POST")).status, 403);
      assert.equal((await call(request, tutorUser.token, "POST")).body.requested, true);
      assert.equal((await call(request, tutorUser.token, "POST")).body.requested, true);
      const addressRequests = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, parent.id));
      assert.equal(addressRequests.filter((row) => row.type === "student_address_requested").length, 1);
      assert.match(addressRequests.find((row) => row.type === "student_address_requested")?.actionUrl ?? "", /student=.*edit=address/);

      assert.equal((await createFor("16:00", addresslessChild.id, "in_person")).status, 409);
      assert.equal((await createFor("16:00", addresslessChild.id, "online")).status, 201);
      await clearSessions();
    });
    await t.test("hold does not confirm, capture or invoice; only owning tutor can accept", async () => {
      const created = await create();
      assert.equal(created.status, 201);
      assert.equal(created.body.status, "pending_payment");
      const id = created.body.id;
      assert.equal((await hold(id, outsider.token)).status, 403);
      assert.equal((await hold(id)).body.status, "authorized");
      assert.equal((await hold(id)).body.status, "authorized"); // Safe retry.
      const pending = await call(`/sessions/${id}`, parent.token);
      assert.equal(pending.body.status, "pending_confirmation");
      assert.equal(pending.body.isPaid, false);
      assert.ok(Date.parse(pending.body.requestExpiresAt) <= Date.parse(pending.body.scheduledAt));
      assert.equal((await db.select().from(invoicesTable).where(eq(invoicesTable.sessionId, id))).length, 0);
      assert.equal((await decide(id, "accept", parent.token)).status, 403);
      assert.equal((await decide(id, "accept", wrongTutor.token)).status, 403);
      assert.equal((await decide(id, "accept", admin.token)).status, 403);
      assert.equal((await call(`/sessions/${id}/complete`, tutorUser.token, "POST")).status, 409);
      assert.equal((await call(`/sessions/${id}`, outsider.token)).status, 403);
      const tutorList = await call("/sessions", tutorUser.token);
      assert.ok(tutorList.body.some((s: any) => s.id === id && s.status === "pending_confirmation"));
      const results = await Promise.all([decide(id), decide(id)]);
      assert.deepEqual(results.map((r) => r.status), [200, 200]);
      assert.equal(results[0].body.status, "scheduled");
      assert.equal(results[0].body.isPaid, true);
      assert.equal((await db.select().from(invoicesTable).where(eq(invoicesTable.sessionId, id))).length, 1);
      assert.equal((await db.select().from(paymentsTable).where(eq(paymentsTable.sessionId, id))).length, 1);
      assert.equal((await call("/payments", parent.token)).body.find((p: any) => p.sessionId === id).status, "paid");
      await clearSessions();
    });
    await t.test("tutor offers are visible and reserve their slot across families until withdrawn", async () => {
      await db.insert(sessionsTable).values({
        tutorId: tutor.id, studentId: child.id, subject: "Previous lesson",
        scheduledAt: new Date(Date.now() - 7 * 86_400_000), durationMinutes: 60,
        status: "completed", isPaid: false, totalAmount: 60,
      });

      const offered = await offer();
      assert.equal(offered.status, 201);
      assert.equal(offered.body.status, "pending_payment");
      assert.ok(offered.body.tutorConfirmedAt);
      assert.ok(Date.parse(offered.body.requestExpiresAt) > Date.now());

      const tutorOffers = await call("/sessions?status=pending_payment", tutorUser.token);
      assert.ok(tutorOffers.body.some((session: any) => session.id === offered.body.id && session.tutorConfirmedAt));

      const otherFamilySlots = await call(
        `/tutors/${tutor.id}/available-slots?date=${date}&duration=60&lessonMode=in_person`,
        outsider.token,
      );
      assert.equal(otherFamilySlots.status, 200);
      assert.ok(!otherFamilySlots.body.slots.includes("16:00"));
      assert.equal((await create("16:00", outsider.token, otherChild.id)).status, 409);

      const notifications = await db.select().from(notificationsTable).where(inArray(notificationsTable.userId, [parent.id, childUser.id]));
      assert.ok(notifications.some((n) => n.userId === parent.id && n.title === "Your tutor offered a lesson time"));
      assert.ok(notifications.some((n) => n.userId === childUser.id && n.title === "Your tutor suggested a lesson time"));

      const withdrawn = await call(`/sessions/${offered.body.id}/cancel`, parent.token, "POST");
      assert.equal(withdrawn.status, 200);
      const availableAgain = await call(
        `/tutors/${tutor.id}/available-slots?date=${date}&duration=60&lessonMode=in_person`,
        outsider.token,
      );
      assert.ok(availableAgain.body.slots.includes("16:00"));

      const concurrent = await Promise.all([
        offer("17:15", child.id, "in_person"),
        create("17:15", outsider.token, otherChild.id, "in_person"),
      ]);
      assert.equal(concurrent.filter((response) => response.status === 201).length, 1);
      for (const [index, response] of concurrent.entries()) {
        if (response.status === 201) {
          await call(`/sessions/${response.body.id}/cancel`, index === 0 ? parent.token : outsider.token, "POST");
        }
      }
      await clearSessions();
    });
    await t.test("decline, withdrawal and expiry release holds and restore availability", async () => {
      for (const action of ["decline", "withdraw", "expire"]) {
        const created = await create();
        assert.equal(created.status, 201);
        const id = created.body.id;
        await hold(id);
        let result;
        if (action === "expire") {
          await db.update(sessionsTable).set({ requestExpiresAt: new Date(Date.now() - 1000) }).where(eq(sessionsTable.id, id));
          result = await decide(id);
          assert.equal(result.status, 409);
        } else if (action === "withdraw") {
          result = await call(`/sessions/${id}/cancel`, parent.token, "POST");
          assert.equal(result.status, 200);
        } else {
          result = await decide(id, "decline");
          assert.equal(result.status, 200);
        }
        const [stored] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
        assert.equal(stored.status, "cancelled");
        assert.equal(stored.isPaid, false);
        const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.sessionId, id));
        assert.equal(payment.status, "released");
        assert.equal((await db.select().from(invoicesTable).where(eq(invoicesTable.sessionId, id))).length, 0);
        const available = await call(`/tutors/${tutor.id}/available-slots?date=${date}&duration=60&lessonMode=in_person`, parent.token);
        assert.ok(available.body.slots.includes("16:00"));
      }
      await clearSessions();
    });
    await t.test("simultaneous competing parents cannot double book the tutor", async () => {
      const responses = await Promise.all([create(), create("16:15", outsider.token, otherChild.id)]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
      await clearSessions();
    });
    await t.test("travel is respected in either booking order and online can be consecutive", async () => {
      assert.equal((await create("17:15")).status, 201);
      assert.equal((await create("16:00")).status, 201);
      await clearSessions();
      assert.equal((await create("16:15", parent.token, child.id, "online")).status, 201);
      assert.equal((await create("17:15", outsider.token, otherChild.id, "online")).status, 201);
      await clearSessions();
      assert.equal((await create("16:15")).status, 201);
      assert.equal((await create("17:15", outsider.token, otherChild.id, "online")).status, 409);
      await clearSessions();
    });
    await t.test("capture failure rolls back confirmation and never produces an invoice", async () => {
      const created = await create(), id = created.body.id;
      await hold(id);
      await db.update(paymentsTable).set({ status: "released" }).where(eq(paymentsTable.sessionId, id));
      assert.equal((await decide(id)).status, 409);
      const [stored] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
      assert.equal(stored.status, "pending_confirmation");
      assert.equal(stored.isPaid, false);
      assert.equal((await db.select().from(invoicesTable).where(eq(invoicesTable.sessionId, id))).length, 0);
      await clearSessions();
    });
    await t.test("requests and confirmations create in-app notifications without secrets", async () => {
      const rows = await db.select().from(notificationsTable).where(inArray(notificationsTable.userId, ids));
      assert.ok(rows.some((n) => n.userId === tutorUser.id && n.type === "action_confirm_session" && n.actionUrl === "/tutor/sessions"));
      assert.ok(rows.some((n) => n.userId === parent.id && n.title === "Booking confirmed by tutor"));
      assert.ok(rows.filter((n) => n.userId === parent.id && n.type !== "whatsapp_connect")
        .every((n) => n.actionUrl === "/parent/dashboard"));
      assert.ok(rows.some((n) => n.title === "Booking request expired"));
      const studentUpdates = rows.filter((n) => n.userId === childUser.id && [
        "Your lesson is confirmed",
        "Your tutor declined the lesson request",
        "Your lesson was cancelled",
        "Your lesson offer expired",
      ].includes(n.title));
      for (const title of [
        "Your lesson is confirmed",
        "Your tutor declined the lesson request",
        "Your lesson was cancelled",
        "Your lesson offer expired",
      ]) {
        assert.ok(studentUpdates.some((n) => n.title === title), `missing student update: ${title}`);
      }
      assert.ok(studentUpdates.every((n) => n.actionUrl === "/student/dashboard"));
      assert.ok(studentUpdates.every((n) => n.message.includes("Mathematics") && n.message.includes("Synthetic")));
      assert.doesNotMatch(rows.map((n) => n.message).join("\n"), /Bearer |synthetic-no-login/);
    });
  } finally {
    if (tutorIds.length) {
      const sessions = await db.select({ id: sessionsTable.id }).from(sessionsTable).where(inArray(sessionsTable.tutorId, tutorIds));
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length) {
        await db.delete(invoicesTable).where(inArray(invoicesTable.sessionId, sessionIds));
        await db.delete(paymentsTable).where(inArray(paymentsTable.sessionId, sessionIds));
        await db.delete(sessionsTable).where(inArray(sessionsTable.id, sessionIds));
      }
      await db.delete(availabilityTable).where(inArray(availabilityTable.tutorId, tutorIds));
      await db.delete(tutorAvailabilityOverridesTable).where(inArray(tutorAvailabilityOverridesTable.tutorId, tutorIds));
      await db.delete(tutorRelationshipsTable).where(inArray(tutorRelationshipsTable.tutorId, tutorIds));
    }
    if (childIds.length) await db.delete(studentsTable).where(inArray(studentsTable.id, childIds));
    if (tutorIds.length) await db.delete(tutorsTable).where(inArray(tutorsTable.id, tutorIds));
    if (ids.length) {
      await db.delete(notificationsTable).where(inArray(notificationsTable.userId, ids));
      await db.delete(usersTable).where(inArray(usersTable.id, ids));
    }
    await pool.end();
  }
});
