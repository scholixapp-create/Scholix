import { db, reviewsTable, sessionsTable, studentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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
  findTutorReview: (authorId, tutorId) => findTutorReview(db, authorId, tutorId),
  transaction: (work) => db.transaction((tx) => work({
    lockAuthor: async (authorId) => {
      await tx.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.id, authorId)).for("update");
    },
    getSessionForUpdate: (id) => getSession(tx, id, true),
    findReview: (id) => findReview(tx, id),
    findTutorReview: (authorId, tutorId) => findTutorReview(tx, authorId, tutorId),
    insertReview: async (value) => {
      const [review] = await tx.insert(reviewsTable).values(value).returning();
      return review;
    },
  }), { isolationLevel: "read committed" }),
};

async function findTutorReview(connection: Connection, authorId: number, tutorId: number) {
  const [review] = await connection.select().from(reviewsTable)
    .where(and(eq(reviewsTable.authorId, authorId), eq(reviewsTable.tutorId, tutorId)))
    .orderBy(reviewsTable.createdAt, reviewsTable.id).limit(1);
  return review;
}
