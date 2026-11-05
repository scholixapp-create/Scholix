export function canReapply(user: { isActive: boolean; role: string }, requestedRole: string): boolean {
  return !user.isActive && (user.role === "parent" || user.role === "tutor") && user.role === requestedRole;
}

export function canRequestCode(previous: { sends: number; windowStartedAt: Date } | undefined, now: Date) {
  return !previous || now.getTime() - previous.windowStartedAt.getTime() >= 600_000 || previous.sends < 3;
}
