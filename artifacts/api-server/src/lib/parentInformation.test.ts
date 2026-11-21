import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canUseProtectedResources } from "./parentApproval";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("pending parents can complete intake and access only their own request routes", () => {
  const pendingParent = { role: "parent", parentApproved: false };
  assert.equal(canUseProtectedResources(pendingParent, "/parent/intake"), true);
  assert.equal(canUseProtectedResources(pendingParent, "/parent/information-requests"), true);
  assert.equal(canUseProtectedResources(pendingParent, "/parent/information-requests/12/respond"), true);
  assert.equal(canUseProtectedResources(pendingParent, "/parent/information-requests/12/close"), false);
  assert.equal(canUseProtectedResources(pendingParent, "/students"), false);
  assert.equal(canUseProtectedResources(pendingParent, "/parent/dashboard"), false);
  assert.equal(canUseProtectedResources({ role: "parent", parentApproved: true }, "/students"), true);
});

test("parent information routes enforce role and ownership and serialize responses", async () => {
  const route = await readFile(path.join(sourceRoot, "routes", "parentInformation.ts"), "utf8");
  assert.match(route, /router\.get\("\/parent\/intake", requireAuth/);
  assert.match(route, /router\.put\("\/parent\/intake", requireAuth/);
  assert.match(route, /eq\(studentsTable\.parentId, parent\.id\)/);
  assert.match(route, /currentStudents\.some\(\(student\) => !submittedIds\.includes\(student\.id\)\)/);
  assert.match(route, /router\.get\("\/parent\/information-requests", requireAuth/);
  assert.match(route, /router\.post\("\/parent\/information-requests\/:requestId\/respond", requireAuth/);
  assert.match(route, /actor\.role !== "parent"/);
  assert.match(route, /request\.parentUserId !== actor\.id/);
  assert.match(route, /request\.status !== "pending"/);
  assert.match(route, /\.for\("update"\)/);
  assert.match(route, /RespondParentInformationRequestResponse\.parse/);
  assert.match(route, /GetParentIntakeResponse\.parse/);
  assert.match(route, /UpdateParentIntakeResponse\.parse/);
});

test("admin parent requests create durable in-app notices and send transactional email", async () => {
  const route = await readFile(path.join(sourceRoot, "routes", "admin.ts"), "utf8");
  assert.match(route, /return requireAdmin\(req, res, next\)/);
  assert.match(route, /router\.post\("\/admin\/users\/:userId\/information-requests"/);
  assert.match(route, /parent\.role !== "parent"/);
  assert.match(route, /action: "parent_information_requested"/);
  assert.match(route, /action: "parent_information_closed"/);
  assert.match(route, /tx\.insert\(notificationsTable\)\.values/);
  assert.match(route, /await sendEmail\(\{/);
  assert.match(route, /parentInformationRequestedEmailHtml/);
  assert.match(route, /if \(intakeIssues\.length\) return \{ kind: "incomplete"/);
  assert.ok(route.indexOf("if (intakeIssues.length)") < route.indexOf('action: "parent_approved"'));
});
