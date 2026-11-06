import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fullStudentName, mayManageStudent, assertRemovalTarget } from "./accountRemoval";
import { canReapply } from "./reapplicationPolicy";

test("only a parent owning a child or an admin may manage its profile", () => {
  assert.equal(mayManageStudent({ id: 4, role: "parent" }, 4), true);
  assert.equal(mayManageStudent({ id: 5, role: "parent" }, 4), false);
  assert.equal(mayManageStudent({ id: 4, role: "tutor" }, 4), false);
  assert.equal(mayManageStudent({ id: 4, role: "student" }, 4), false);
  assert.equal(mayManageStudent({ id: 4, role: "parent" }, null), false);
  assert.equal(mayManageStudent({ id: 1, role: "admin" }, null), true);
});
test("family review excludes self-removal and every admin, including the last", () => {
  assert.throws(() => assertRemovalTarget(1, { id: 1, role: "parent" }), /own account/);
  assert.throws(() => assertRemovalTarget(1, { id: 2, role: "admin" }), /Administrator/);
  assert.throws(() => assertRemovalTarget(1, { id: 2, role: "parent", archivedAt: new Date() }), /already archived/);
  assert.doesNotThrow(() => assertRemovalTarget(1, { id: 2, role: "parent" }));
});
test("child confirmation names include the actual stored surname without null", () => {
  assert.equal(fullStudentName({ firstName: "Alex", lastName: null }), "Alex");
  assert.equal(fullStudentName({ firstName: "Alex", lastName: "Smith" }), "Alex Smith");
});
test("archived removal cannot be undone through inactive-account reapplication", () => {
  assert.equal(canReapply({ role: "parent", isActive: false, archivedAt: new Date() }, "parent"), false);
  assert.equal(canReapply({ role: "parent", isActive: false, archivedAt: null }, "parent"), true);
});
test("family removal writes no session, payment, invoice, dispute or audit deletions", async () => {
  const source = await readFile(new URL("./accountRemoval.ts", import.meta.url), "utf8");
  for (const table of ["sessionsTable", "paymentsTable", "invoicesTable", "reportsTable", "adminUserActionsTable", "accountLifecycleActionsTable"]) {
    assert.ok(!source.includes(`.delete(${table})`), table);
  }
  assert.match(source, /authVersion: sql`\$\{usersTable.authVersion\} \+ 1`/);
  assert.match(source, /status IN \('pending_payment', 'pending_confirmation', 'scheduled'\)/);
  assert.match(source, /for\("update"\)/);
});
test("lifecycle audit SQL blocks update, delete and truncate and has no identity FKs", async () => {
  const migration = await readFile(new URL("../../../../lib/db/migrations/0006_family_account_removal.sql", import.meta.url), "utf8");
  assert.match(migration, /BEFORE UPDATE OR DELETE OR TRUNCATE/);
  assert.match(migration, /RAISE EXCEPTION/);
  assert.doesNotMatch(migration, /REFERENCES/i);
});
