export type AdminWaiverCommission = {
  commissionRate: 0;
  platformCommission: 0;
  tutorEarnings: number;
  tier: "admin_waived";
  isCommissionFree: true;
};

export function getAdminCommissionWaiver(
  enabled: boolean,
  anExistingFreeRuleApplies: boolean,
  totalAmount: number,
): AdminWaiverCommission | null {
  if (!enabled || anExistingFreeRuleApplies) return null;
  return {
    commissionRate: 0,
    platformCommission: 0,
    tutorEarnings: totalAmount,
    tier: "admin_waived",
    isCommissionFree: true,
  };
}
