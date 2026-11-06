import test from "node:test";
import assert from "node:assert/strict";
import { orderUserRequests, requestPriority } from "./adminRequests";

test("user requests prioritise removals, then blocked reapplications, then other approvals", () => {
  const at = new Date("2026-01-01");
  const input = [
    { id: "parent", priority: requestPriority.parent_approval, requestedAt: at },
    { id: "reapply", priority: requestPriority.reapplication, requestedAt: new Date("2026-02-01") },
    { id: "remove", priority: requestPriority.removal, requestedAt: new Date("2026-03-01") },
  ];
  assert.deepEqual(orderUserRequests(input).map((r) => r.id), ["remove", "reapply", "parent"]);
  assert.equal(input[0].id, "parent");
});
test("equal-priority requests are oldest first with stable deterministic ties", () => {
  const input = [
    { id: "c", priority: "normal" as const, requestedAt: new Date("2026-02-01") },
    { id: "b", priority: "normal" as const, requestedAt: new Date("2026-01-01") },
    { id: "a", priority: "normal" as const, requestedAt: new Date("2026-01-01") },
  ];
  assert.deepEqual(orderUserRequests(input).map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual(orderUserRequests([]), []);
});
