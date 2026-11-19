import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  parentInformationRequestsTable,
} from "@workspace/db";
import {
  ListParentInformationRequestsResponse,
  RespondParentInformationRequestParams,
  RespondParentInformationRequestBody,
  RespondParentInformationRequestResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/authMiddleware";

const router = Router();

router.get("/parent/information-requests", requireAuth, async (req, res): Promise<void> => {
  const actor = (req as AuthRequest).user;
  if (actor.role !== "parent") {
    res.status(403).json({ error: "Parent account required" });
    return;
  }

  const requests = await db.select().from(parentInformationRequestsTable)
    .where(eq(parentInformationRequestsTable.parentUserId, actor.id))
    .orderBy(desc(parentInformationRequestsTable.requestedAt));
  res.set("Cache-Control", "no-store");
  res.json(ListParentInformationRequestsResponse.parse(requests));
});

router.post("/parent/information-requests/:requestId/respond", requireAuth, async (req, res): Promise<void> => {
  const actor = (req as AuthRequest).user;
  if (actor.role !== "parent") {
    res.status(403).json({ error: "Parent account required" });
    return;
  }
  const params = RespondParentInformationRequestParams.safeParse(req.params);
  const body = RespondParentInformationRequestBody.safeParse(req.body);
  if (!params.success || !body.success || !body.data.responseText.trim()) {
    res.status(400).json({ error: "Enter a response before submitting" });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [request] = await tx.select().from(parentInformationRequestsTable)
      .where(eq(parentInformationRequestsTable.id, params.data.requestId))
      .limit(1)
      .for("update");
    if (!request || request.parentUserId !== actor.id) return "not-found" as const;
    if (request.status !== "pending") return "closed" as const;

    const [updated] = await tx.update(parentInformationRequestsTable)
      .set({
        responseText: body.data.responseText.trim(),
        status: "responded",
        respondedAt: new Date(),
      })
      .where(and(
        eq(parentInformationRequestsTable.id, request.id),
        eq(parentInformationRequestsTable.status, "pending"),
      ))
      .returning();
    if (!updated) return "closed" as const;
    return updated;
  });

  if (result === "not-found") {
    res.status(404).json({ error: "Information request not found" });
    return;
  }
  if (result === "closed") {
    res.status(409).json({ error: "This information request is no longer open" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json(RespondParentInformationRequestResponse.parse(result));
});

export default router;
