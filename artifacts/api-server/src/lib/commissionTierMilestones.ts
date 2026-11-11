export interface CommissionTierMilestone {
  sessions: number;
  label: "Growth" | "Established" | "Expert";
}

const MILESTONES: CommissionTierMilestone[] = [
  { sessions: 10, label: "Growth" },
  { sessions: 25, label: "Established" },
  { sessions: 50, label: "Expert" },
];

export function getCommissionTierMilestone(completedSessions: number): CommissionTierMilestone | null {
  return MILESTONES.find((milestone) => milestone.sessions === completedSessions) ?? null;
}
