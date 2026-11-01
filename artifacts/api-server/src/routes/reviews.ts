import { Router, type Response } from "express";
import { db, reviewsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/authMiddleware";
import { sessionReviewStore } from "../lib/sessionReviewStore";
import { getParentReview, submitParentReview, serializeReview, reviewResourceId, ReviewError } from "../lib/sessionReviews";

const router = Router();

function respondToError(error: unknown, res: Response) {
  if (error instanceof ReviewError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  throw error;
}

// Public profiles intentionally expose reviews, never authentication data.
router.get("/tutors/:tutorId/reviews", async (req, res) => {
  try {
    const tutorId = reviewResourceId(req.params.tutorId);
    const reviews = await db.select().from(reviewsTable)
      .where(eq(reviewsTable.tutorId, tutorId)).orderBy(reviewsTable.createdAt);
    res.json(reviews.map(serializeReview));
  } catch (error) {
    respondToError(error, res);
  }
});

router.get("/sessions/:sessionId/reviews", requireAuth, async (req, res) => {
  try {
    const state = await getParentReview(
      sessionReviewStore, (req as AuthRequest).user, reviewResourceId(req.params.sessionId),
    );
    res.json({ eligible: state.eligible, review: state.review ? serializeReview(state.review) : null });
  } catch (error) {
    respondToError(error, res);
  }
});

router.post("/sessions/:sessionId/reviews", requireAuth, async (req, res) => {
  try {
    const review = await submitParentReview(
      sessionReviewStore, (req as AuthRequest).user, reviewResourceId(req.params.sessionId), req.body,
    );
    res.status(201).json(serializeReview(review));
  } catch (error) {
    respondToError(error, res);
  }
});

export default router;
