import { db, reviewsTable, sessionsTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { ReviewStore } from "./sessionReviews";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Connection = typeof db | Transaction;

async function getSession(connection: Connection, id: number, lock = false) {
  const query = connection.select({
    id: sessionsTable.id,
    tutorId: sessionsTable.tutorId,
    status: sessionsTable.status,
    parentId: studentsTable.parentId,
  }).from(sessionsTable)
    .innerJoin(studentsTable, eq(studentsTable.id, sessionsTable.studentId))
    .where(eq(sessionsTable.id, id)).limit(1);
  const rows = lock ? await query.for("update", { of: sessionsTable }) : await query;
  return rows[0];
}

async function findReview(connection: Connection, sessionId: number) {
  const [review] = await connection.select().from(reviewsTable)
    .where(eq(reviewsTable.sessionId, sessionId)).orderBy(reviewsTable.id).limit(1);
  return review;
}

export const sessionReviewStore: ReviewStore = {
  getSession: (id) => getSession(db, id),
  findReview: (id) => findReview(db, id),
  transaction: (work) => db.transaction((tx) => work({
    getSessionForUpdate: (id) => getSession(tx, id, true),
    findReview: (id) => findReview(tx, id),
    insertReview: async (value) => {
      const [review] = await tx.insert(reviewsTable).values(value).returning();
      return review;
    },
  }), { isolationLevel: "read committed" }),
};
