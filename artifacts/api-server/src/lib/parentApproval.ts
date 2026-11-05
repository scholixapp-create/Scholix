export type ApprovalUser = { role: string; parentApproved?: boolean };

export function isPendingParent(user: ApprovalUser): boolean {
  return user.role === "parent" && user.parentApproved === false;
}

export function canUseProtectedResources(user: ApprovalUser, path: string): boolean {
  // Pending parents can authenticate and recheck status, but not reach business APIs.
  return !isPendingParent(user) || path === "/auth/me" || path === "/auth/logout";
}
