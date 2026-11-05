import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { canUseProtectedResources, isPendingParent } from "./parentApproval";
import { canActOnSession, canBookForStudent } from "./sessionAccess";
import { educationDecision, educationProposal, serializeEducation, EducationError, type EducationState } from "./tutorEducation";
import { SubmitEducationBody, DecideEducationBody, UpdateMyPromotionBody } from "@workspace/api-zod";
import { sessionCompletedEmailHtml } from "./email";

const parent = { id: 7, role: "parent", parentApproved: true };
const pending = { ...parent, parentApproved: false };
const tutor: EducationState = {
  id: 12, userId: 20, educationDetails: "Previously approved qualification",
  pendingEducationDetails: "New qualification", educationReviewStatus: "pending",
  educationReviewNotes: null, educationSubmittedAt: new Date("2026-11-05T02:00:00.000Z"),
};
const revision = tutor.educationSubmittedAt!.toISOString();

test("pending parents can check identity, but cannot use protected business APIs", () => {
  assert.equal(isPendingParent(pending), true);
  for (const path of ["/auth/me", "/auth/logout"]) assert.equal(canUseProtectedResources(pending, path), true);
  for (const path of ["/sessions", "/students", "/sessions/1/reviews", "/payments/simulate", "/tutors/me"]) {
    assert.equal(canUseProtectedResources(pending, path), false);
    assert.equal(canUseProtectedResources(parent, path), true);
  }
  assert.equal(isPendingParent({ role: "admin", parentApproved: false }), false);
});

test("booking requires the student's approved parent; parents cannot complete lessons to manufacture reviews", () => {
  const parties = { parentId: 7, tutorUserId: 20 };
  assert.equal(canBookForStudent(parent, 7), true);
  assert.equal(canBookForStudent(parent, 8), false);
  assert.equal(canBookForStudent(pending, 7), false);
  assert.equal(canActOnSession(parent, parties, "pay"), true);
  assert.equal(canActOnSession(pending, parties, "pay"), false);
  assert.equal(canActOnSession(parent, parties, "complete"), false);
  assert.equal(canActOnSession({ id: 20, role: "tutor" }, parties, "complete"), true);
  assert.equal(canActOnSession({ id: 21, role: "tutor" }, parties, "complete"), false);
  assert.equal(canActOnSession({ id: 99, role: "admin" }, parties, "complete"), true);
  assert.equal(canActOnSession(parent, parties, "cancel"), true);
  assert.equal(canActOnSession({ ...parent, id: 8 }, parties, "cancel"), false);
});

test("qualification proposals never publish education or change account approval", () => {
  const proposal = educationProposal("  Masters in teaching  ", tutor.educationSubmittedAt, tutor.educationSubmittedAt!);
  assert.equal(proposal.pendingEducationDetails, "Masters in teaching");
  assert.equal(proposal.educationReviewStatus, "pending");
  assert.equal(proposal.educationSubmittedAt.getTime(), tutor.educationSubmittedAt!.getTime() + 1);
  assert.equal("educationDetails" in proposal, false);
  assert.equal("isApproved" in proposal, false);
  for (const value of ["", "  ", null, 3, "a".repeat(5001)]) {
    assert.throws(() => educationProposal(value, null), (e: unknown) => e instanceof EducationError && e.status === 400);
  }
});

test("only approval publishes the pending proposal; rejection preserves approved text", () => {
  const approved = educationDecision(tutor, { action: "approve", expectedSubmittedAt: revision });
  assert.equal(approved.educationDetails, "New qualification");
  assert.equal(approved.pendingEducationDetails, null);
  assert.equal(approved.educationReviewStatus, "approved");
  const rejected = educationDecision(tutor, { action: "reject", expectedSubmittedAt: revision, notes: "  Evidence needed  " });
  assert.equal("educationDetails" in rejected, false);
  assert.equal(rejected.educationReviewNotes, "Evidence needed");
  assert.equal(serializeEducation({ ...tutor, ...rejected }).educationDetails, tutor.educationDetails);
});

test("stale, repeated, or no-longer-pending qualification decisions are rejected", () => {
  for (const state of [{ ...tutor, educationReviewStatus: "approved" }, { ...tutor, educationSubmittedAt: new Date() }]) {
    assert.throws(() => educationDecision(state, { action: "approve", expectedSubmittedAt: revision }),
      (e: unknown) => e instanceof EducationError && e.status === 409);
  }
});

test("qualification and promotion bodies reject unsupported fields and invalid values", () => {
  assert.equal(SubmitEducationBody.strict().safeParse({ educationDetails: "Degree", isApproved: true }).success, false);
  assert.equal(DecideEducationBody.strict().safeParse({ action: "approve", expectedSubmittedAt: revision }).success, true);
  assert.equal(DecideEducationBody.strict().safeParse({ action: "approve" }).success, false);
  assert.equal(UpdateMyPromotionBody.strict().safeParse({ action: "share_profile", completed: true }).success, true);
  assert.equal(UpdateMyPromotionBody.strict().safeParse({ action: "fake", completed: true }).success, false);
  assert.equal(UpdateMyPromotionBody.strict().safeParse({ action: "share_profile", completed: "true" }).success, false);
});

test("completion emails include a review link only when supplied for an eligible parent", () => {
  const options = { recipientName: "Parent", tutorName: "Tutor", studentName: "Student", subject: "Maths", date: "Monday", duration: 60, totalAmount: 50 };
  assert.doesNotMatch(sessionCompletedEmailHtml(options), /Leave a review/);
  const html = sessionCompletedEmailHtml({ ...options, reviewUrl: "https://example.test/parent/dashboard?reviewSession=42&source=email" });
  assert.match(html, /Leave a review/);
  assert.match(html, /reviewSession=42&amp;source=email/);
  assert.match(html, /one review per tutor/);
});

test("approval routes use database authorization, transaction locks and append-only audit entries", () => {
  const updates = readFileSync(new URL("../routes/tutorUpdates.ts", import.meta.url), "utf8");
  assert.match(updates, /router\.post\("\/admin\/tutors\/:tutorId\/education", requireAdmin/);
  assert.match(updates, /actor\.role !== "tutor"/);
  assert.match(updates, /\.for\("update"\)/);
  assert.match(updates, /tx\.insert\(adminUserActionsTable\)/);
  const admins = readFileSync(new URL("../routes/admin.ts", import.meta.url), "utf8");
  assert.match(admins, /requireAdmin\(req, res, next\)/);
  assert.match(admins, /target\.role !== "parent" \|\| !target\.isActive \|\| target\.parentApproved/);
  assert.match(admins, /action: "parent_approved"/);
  const auth = readFileSync(new URL("../routes/auth.ts", import.meta.url), "utf8");
  assert.match(auth, /parentApproved: role !== "parent"/);
  const sessions = readFileSync(new URL("../routes/sessions.ts", import.meta.url), "utf8");
  assert.match(sessions, /router\.post\("\/sessions", requireAuth/);
  assert.match(sessions, /router\.post\("\/sessions\/:sessionId\/complete", requireAuth/);
  const payments = readFileSync(new URL("../routes/payments.ts", import.meta.url), "utf8");
  assert.match(payments, /router\.get\("\/payments", requireAuth/);
  assert.match(payments, /eq\(studentsTable\.parentId, actor\.id\)/);
  assert.match(payments, /eq\(tutorsTable\.userId, actor\.id\)/);
  assert.match(payments, /eq\(studentsTable\.userId, actor\.id\)/);
});
