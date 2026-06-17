import { Router } from "express";
import { db, reviewsTable, sessionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/tutors/:tutorId/reviews
router.get("/tutors/:tutorId/reviews", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  if (isNaN(tutorId)) {
    res.status(400).json({ error: "Invalid tutor ID" });
    return;
  }

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.tutorId, tutorId))
    .orderBy(reviewsTable.createdAt);

  res.json(
    reviews.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      authorId: r.authorId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

// POST /api/sessions/:sessionId/reviews
router.post("/sessions/:sessionId/reviews", async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const { rating, comment, tutorId } = req.body as { rating?: number; comment?: string; tutorId?: number };
  if (!rating || rating < 1 || rating > 5 || !tutorId) {
    res.status(400).json({ error: "rating (1-5) and tutorId are required" });
    return;
  }

  const userId = (req as { user?: { id: number } }).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Check session exists and is completed
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.status, "completed")))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found or not yet completed" });
    return;
  }

  const [existing] = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.sessionId, sessionId), eq(reviewsTable.authorId, userId)))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Review already submitted for this session" });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({ sessionId, authorId: userId, tutorId, rating, comment: comment ?? null })
    .returning();

  res.status(201).json({
    id: review.id,
    sessionId: review.sessionId,
    authorId: review.authorId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  });
});

export default router;
