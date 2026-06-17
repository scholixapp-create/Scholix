import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type AuthRequest = Request & { user: typeof usersTable.$inferSelect };

export function parseUserId(authHeader: string | undefined): number | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = Buffer.from(authHeader.slice(7), "base64").toString("utf-8");
    const id = parseInt(decoded.split(":")[0], 10);
    return isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = parseUserId(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  db.select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1)
    .then(([user]) => {
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      (req as AuthRequest).user = user;
      next();
    })
    .catch(() => res.status(500).json({ error: "Internal server error" }));
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const userId = parseUserId(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  db.select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1)
    .then(([user]) => {
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      if (user.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      (req as AuthRequest).user = user;
      next();
    })
    .catch(() => res.status(500).json({ error: "Internal server error" }));
}
