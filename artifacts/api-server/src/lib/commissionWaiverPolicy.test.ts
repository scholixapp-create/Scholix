import assert from "node:assert/strict";
import test from "node:test";
import { getAdminCommissionWaiver } from "./commissionWaiverPolicy";

test("an active admin waiver sets platform commission to zero", () => {
  assert.deepEqual(getAdminCommissionWaiver(true, false, 80), {
    commissionRate: 0,
    platformCommission: 0,
    tutorEarnings: 80,
    tier: "admin_waived",
    isCommissionFree: true,
  });
});

test("disabled waivers and existing free rules retain their normal commission path", () => {
  assert.equal(getAdminCommissionWaiver(false, false, 80), null);
  assert.equal(getAdminCommissionWaiver(true, true, 80), null);
});
