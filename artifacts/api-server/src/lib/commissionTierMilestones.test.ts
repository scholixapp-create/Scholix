import assert from "node:assert/strict";
import test from "node:test";
import { getCommissionTierMilestone } from "./commissionTierMilestones";

test("commission tier milestones trigger only at tier thresholds", () => {
  assert.equal(getCommissionTierMilestone(9), null);
  assert.deepEqual(getCommissionTierMilestone(10), { sessions: 10, label: "Growth" });
  assert.equal(getCommissionTierMilestone(24), null);
  assert.deepEqual(getCommissionTierMilestone(25), { sessions: 25, label: "Established" });
  assert.equal(getCommissionTierMilestone(49), null);
  assert.deepEqual(getCommissionTierMilestone(50), { sessions: 50, label: "Expert" });
  assert.equal(getCommissionTierMilestone(51), null);
});
