import { CreateSessionReviewBody } from "@workspace/api-zod";

export type ReviewActor = { id: number; role: string };
export type ReviewSession = { id: number; tutorId: number; parentId: number | null; status: string };
export type ReviewRecord = {
  id: number;
  sessionId: number;
  authorId: number;
  tutorId: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
};
export type ReviewInsert = Omit<ReviewRecord, "id" | "createdAt">;

export interface ReviewTransaction {
  getSessionForUpdate(id: number): Promise<ReviewSession | undefined>;
  findReview(sessionId: number): Promise<ReviewRecord | undefined>;
  insertReview(value: ReviewInsert): Promise<ReviewRecord>;
}
export interface ReviewStore {
  getSession(id: number): Promise<ReviewSession | undefined>;
  findReview(sessionId: number): Promise<ReviewRecord | undefined>;
  transaction<T>(work: (tx: ReviewTransaction) => Promise<T>): Promise<T>;
}

export class ReviewError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export function reviewResourceId(raw: unknown): number {
  if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > 2_147_483_647) {
    throw new ReviewError("Invalid session or tutor ID", 400);
  }
  return Number(raw);
}

function requireParent(actor: ReviewActor | undefined): asserts actor is ReviewActor {
  if (!actor) throw new ReviewError("Authentication required", 401);
  if (actor.role !== "parent") throw new ReviewError("Only parents can review their children's sessions", 403);
}

function requireOwnedSession(session: ReviewSession | undefined, parentId: number): asserts session is ReviewSession {
  if (!session || session.parentId !== parentId) throw new ReviewError("Session unavailable", 404);
}

export async function getParentReview(store: ReviewStore, actor: ReviewActor | undefined, sessionId: number) {
  requireParent(actor);
  const session = await store.getSession(sessionId);
  requireOwnedSession(session, actor.id);
  const review = await store.findReview(sessionId);
  return { eligible: session.status === "completed" && !review, review: review ?? null };
}

export async function submitParentReview(
  store: ReviewStore, actor: ReviewActor | undefined, sessionId: number, body: unknown,
): Promise<ReviewRecord> {
  requireParent(actor);
  const parsed = CreateSessionReviewBody.strict().safeParse(body);
  if (!parsed.success) {
    throw new ReviewError("Provide a whole-number rating from 1 to 5 and an optional comment of at most 2,000 characters. Do not include other fields.", 400);
  }

  return store.transaction(async (tx) => {
    // Every submission locks the same session row before checking/inserting a review.
    // The lock lasts until commit, so two concurrent requests cannot both insert.
    const session = await tx.getSessionForUpdate(sessionId);
    requireOwnedSession(session, actor.id);
    if (session.status !== "completed") throw new ReviewError("Only completed sessions can be reviewed", 409);
    if (await tx.findReview(sessionId)) throw new ReviewError("Review already submitted for this session", 409);
    return tx.insertReview({
      sessionId: session.id,
      tutorId: session.tutorId,
      authorId: actor.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    });
  });
}

export function serializeReview(review: ReviewRecord) {
  return { ...review, createdAt: review.createdAt.toISOString() };
}
