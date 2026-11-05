import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyAccessTokenDetails } from "./authTokens";
import { isAdminRole } from "./authPolicy";
import { canUseProtectedResources, isPendingParent } from "./parentApproval";

export type AuthRequest = Request & { user: typeof usersTable.$inferSelect };

export async function getUserIdFromBearer(authHeader: string | undefined): Promise<number | null> {
  const claims = await verifyAccessTokenDetails(authHeader);
  if (!claims) return null;
  const userId = claims.userId;

  const [user] = await db
    .select({ isActive: usersTable.isActive, role: usersTable.role, parentApproved: usersTable.parentApproved, authVersion: usersTable.authVersion })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user?.isActive && user.authVersion === claims.authVersion && !isPendingParent(user) ? userId : null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void authenticateRequest(req, res, next, false);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  void authenticateRequest(req, res, next, true);
}

async function authenticateRequest(
  req: Request,
  res: Response,
  next: NextFunction,
  adminOnly: boolean,
): Promise<void> {
  try {
    const claims = await verifyAccessTokenDetails(req.headers.authorization);
    if (!claims) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, claims.userId))
      .limit(1);

    if (!user || !user.isActive || user.authVersion !== claims.authVersion) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (adminOnly && !isAdminRole(user.role)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    if (!canUseProtectedResources(user, req.path)) {
      res.status(403).json({
        error: "Your parent account is awaiting admin approval",
        code: "PARENT_APPROVAL_REQUIRED",
      });
      return;
    }

    (req as AuthRequest).user = user;
    next();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}
