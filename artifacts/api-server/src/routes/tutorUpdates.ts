import { Router, type Response } from "express";
import { db, tutorsTable, adminUserActionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SubmitEducationBody, DecideEducationBody, UpdateMyPromotionBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/authMiddleware";
import { educationProposal, educationDecision, serializeEducation, EducationError } from "../lib/tutorEducation";
import { reviewResourceId, ReviewError } from "../lib/sessionReviews";

const router = Router();

function failure(error: unknown, res: Response) {
  if (error instanceof EducationError || error instanceof ReviewError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  throw error;
}

router.get("/tutors/me/education", requireAuth, async (req, res) => {
  const actor = (req as AuthRequest).user;
  if (actor.role !== "tutor") { res.status(403).json({ error: "Tutor access required" }); return; }
  const [tutor] = await db.select().from(tutorsTable).where(eq(tutorsTable.userId, actor.id)).limit(1);
  if (!tutor) { res.status(404).json({ error: "Tutor not found" }); return; }
  res.json(serializeEducation(tutor));
});

router.put("/tutors/me/education", requireAuth, async (req, res) => {
  const actor = (req as AuthRequest).user;
  if (actor.role !== "tutor") { res.status(403).json({ error: "Tutor access required" }); return; }
  const parsed = SubmitEducationBody.strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Provide qualifications between 1 and 5,000 characters" }); return; }
  try {
    const updated = await db.transaction(async (tx) => {
      const [tutor] = await tx.select().from(tutorsTable)
        .where(eq(tutorsTable.userId, actor.id)).limit(1).for("update");
      if (!tutor) throw new EducationError("Tutor not found", 404);
      const [row] = await tx.update(tutorsTable)
        .set(educationProposal(parsed.data.educationDetails, tutor.educationSubmittedAt))
        .where(eq(tutorsTable.id, tutor.id)).returning();
      return row;
    });
    res.json(serializeEducation(updated));
  } catch (error) { failure(error, res); }
});

router.post("/admin/tutors/:tutorId/education", requireAdmin, async (req, res) => {
  const parsed = DecideEducationBody.strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Provide a decision and the proposal revision being reviewed" }); return; }
  try {
    const tutorId = reviewResourceId(req.params.tutorId);
    const actor = (req as AuthRequest).user;
    const updated = await db.transaction(async (tx) => {
      const [tutor] = await tx.select().from(tutorsTable)
        .where(eq(tutorsTable.id, tutorId)).limit(1).for("update");
      if (!tutor) throw new EducationError("Tutor not found", 404);
      const [row] = await tx.update(tutorsTable).set(educationDecision(tutor, parsed.data))
        .where(eq(tutorsTable.id, tutorId)).returning();
      const [target] = await tx.select({ email: usersTable.email }).from(usersTable)
        .where(eq(usersTable.id, tutor.userId)).limit(1);
      await tx.insert(adminUserActionsTable).values({
        actorUserId: actor.id, targetUserId: tutor.userId, targetEmail: target?.email,
        action: parsed.data.action === "approve" ? "education_approved" : "education_rejected",
      });
      return row;
    });
    res.json(serializeEducation(updated));
  } catch (error) { failure(error, res); }
});

router.get("/tutors/me/promotion", requireAuth, async (req, res) => {
  const actor = (req as AuthRequest).user;
  if (actor.role !== "tutor") { res.status(403).json({ error: "Tutor access required" }); return; }
  const [tutor] = await db.select({ id: tutorsTable.id, promotionActions: tutorsTable.promotionActions })
    .from(tutorsTable).where(eq(tutorsTable.userId, actor.id)).limit(1);
  if (!tutor) { res.status(404).json({ error: "Tutor not found" }); return; }
  res.json({ tutorId: tutor.id, completedActions: tutor.promotionActions });
});

router.put("/tutors/me/promotion", requireAuth, async (req, res) => {
  const actor = (req as AuthRequest).user;
  if (actor.role !== "tutor") { res.status(403).json({ error: "Tutor access required" }); return; }
  const parsed = UpdateMyPromotionBody.strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid promotion action" }); return; }
  try {
    const result = await db.transaction(async (tx) => {
      const [tutor] = await tx.select().from(tutorsTable)
        .where(eq(tutorsTable.userId, actor.id)).limit(1).for("update");
      if (!tutor) throw new EducationError("Tutor not found", 404);
      const actions = new Set(tutor.promotionActions);
      if (parsed.data.completed) actions.add(parsed.data.action);
      else actions.delete(parsed.data.action);
      const completedActions = [...actions].sort();
      await tx.update(tutorsTable).set({ promotionActions: completedActions })
        .where(eq(tutorsTable.id, tutor.id));
      return { tutorId: tutor.id, completedActions };
    });
    res.json(result);
  } catch (error) { failure(error, res); }
});

export default router;
