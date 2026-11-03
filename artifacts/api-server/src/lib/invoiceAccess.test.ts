import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { canAccessInvoice, parseInvoiceId, resolveInvoiceListScope } from "./invoiceAccess";

function rejectionStatus(result: ReturnType<typeof resolveInvoiceListScope>) {
  return result.ok ? null : result.status;
}

test("invoice list scope always follows the authenticated parent or tutor", () => {
  assert.deepEqual(resolveInvoiceListScope({ id: 12, role: "parent" }, {}), {
    ok: true,
    kind: "parent",
    userId: 12,
  });
  assert.deepEqual(resolveInvoiceListScope({ id: 21, role: "tutor" }, {}), {
    ok: true,
    kind: "tutor",
    userId: 21,
  });
  assert.equal(resolveInvoiceListScope({ id: 12, role: "parent" }, { parentId: "12" }).ok, true);
  assert.equal(resolveInvoiceListScope({ id: 21, role: "tutor" }, { tutorId: "21" }).ok, true);
});

test("invoice list scope rejects cross-account and cross-role owner queries", () => {
  assert.deepEqual(resolveInvoiceListScope({ id: 12, role: "parent" }, { parentId: "13" }), {
    ok: false,
    status: 403,
    message: "Invoice access denied",
  });
  assert.equal(rejectionStatus(resolveInvoiceListScope({ id: 12, role: "parent" }, { tutorId: "12" })), 403);
  assert.equal(rejectionStatus(resolveInvoiceListScope({ id: 21, role: "tutor" }, { parentId: "21" })), 403);
  assert.equal(rejectionStatus(resolveInvoiceListScope({ id: 30, role: "admin" }, {})), 403);
  assert.equal(rejectionStatus(resolveInvoiceListScope({ id: 31, role: "student" }, {})), 403);
});

test("invoice owner query parameters reject malformed and oversized IDs", () => {
  assert.equal(rejectionStatus(resolveInvoiceListScope({ id: 12, role: "parent" }, { parentId: "12x" })), 400);
  assert.equal(rejectionStatus(resolveInvoiceListScope({ id: 12, role: "parent" }, { parentId: "2147483648" })), 400);
  assert.equal(rejectionStatus(resolveInvoiceListScope({ id: 12, role: "parent" }, { parentId: ["12"] })), 400);
  assert.equal(parseInvoiceId("12"), 12);
  assert.equal(parseInvoiceId("0"), null);
  assert.equal(parseInvoiceId("12junk"), null);
  assert.equal(parseInvoiceId("2147483648"), null);
});

test("invoice PDF access is restricted to its parent or tutor", () => {
  const owner = { parentId: 12, tutorUserId: 21 };
  assert.equal(canAccessInvoice({ id: 12, role: "parent" }, owner), true);
  assert.equal(canAccessInvoice({ id: 21, role: "tutor" }, owner), true);
  assert.equal(canAccessInvoice({ id: 13, role: "parent" }, owner), false);
  assert.equal(canAccessInvoice({ id: 22, role: "tutor" }, owner), false);
  assert.equal(canAccessInvoice({ id: 30, role: "admin" }, owner), false);
});

test("invoice routes require auth and scope database reads to the actor", async () => {
  const source = await readFile(new URL("../routes/invoices.ts", import.meta.url), "utf8");
  assert.match(source, /router\.get\("\/invoices", requireAuth,/);
  assert.match(source, /router\.get\("\/invoices\/:invoiceId\/pdf", requireAuth,/);
  assert.match(source, /resolveInvoiceListScope\(actor/);
  assert.match(source, /eq\(studentsTable\.parentId, scope\.userId\)/);
  assert.match(source, /eq\(tutorsTable\.userId, scope\.userId\)/);
  assert.match(source, /canAccessInvoice\(actor/);
  assert.match(source, /Cache-Control", "private, no-store"/);
});
