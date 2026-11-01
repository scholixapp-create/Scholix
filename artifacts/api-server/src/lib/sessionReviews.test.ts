import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  getParentReview, submitParentReview, reviewResourceId, ReviewError,
  type ReviewActor, type ReviewRecord, type ReviewSession, type ReviewStore,
} from "./sessionReviews";

const parent = { id: 7, role: "parent" };
const session: ReviewSession = { id: 47, tutorId: 16, parentId: 7, status: "completed" };

function fixture(overrides: Partial<ReviewSession> = {}, initial?: ReviewRecord) {
  let review = initial;
  let tail = Promise.resolve();
  const ownedSession = { ...session, ...overrides };
  const store: ReviewStore = {
    getSession: async () => ownedSession,
    findReview: async () => review,
    transaction: async (work) => {
      let release: (() => void) | undefined;
      let pending: ReviewRecord | undefined;
      try {
        const result = await work({
          getSessionForUpdate: async () => {
            const previous = tail;
            tail = new Promise<void>((resolve) => { release = resolve; });
            await previous;
            return ownedSession;
          },
          findReview: async () => review,
          insertReview: async (value) => {
            pending = { ...value, id: 1, createdAt: new Date("2026-01-01T00:00:00Z") };
            return pending;
          },
        });
        if (pending) review = pending;
        return result;
      } finally {
        release?.();
      }
    },
  };
  return { store, saved: () => review };
}

const errorWithStatus = (status: number) => (error: unknown) =>
  error instanceof ReviewError && error.status === status;

test("review reads and writes require an authenticated parent, not a token role claim", async () => {
  for (const actor of [undefined, { id: 7, role: "admin" }, { id: 7, role: "tutor" }, { id: 7, role: "student" }]) {
    const { store } = fixture();
    const status = actor ? 403 : 401;
    await assert.rejects(getParentReview(store, actor, 47), errorWithStatus(status));
    await assert.rejects(submitParentReview(store, actor, 47, { rating: 5 }), errorWithStatus(status));
  }
});

test("another parent cannot inspect or review someone else's session", async () => {
  const { store, saved } = fixture();
  const stranger: ReviewActor = { id: 99, role: "parent" };
  await assert.rejects(getParentReview(store, stranger, 47), errorWithStatus(404));
  await assert.rejects(submitParentReview(store, stranger, 47, { rating: 5 }), errorWithStatus(404));
  assert.equal(saved(), undefined);
});

test("missing sessions disclose no review information", async () => {
  const { store } = fixture();
  store.getSession = async () => undefined;
  await assert.rejects(getParentReview(store, parent, 999), errorWithStatus(404));
});

test("only completed sessions are eligible", async () => {
  for (const status of ["scheduled", "cancelled", "pending_payment"]) {
    const { store, saved } = fixture({ status });
    assert.deepEqual(await getParentReview(store, parent, 47), { eligible: false, review: null });
    await assert.rejects(submitParentReview(store, parent, 47, { rating: 5 }), errorWithStatus(409));
    assert.equal(saved(), undefined);
  }
});

test("ratings must be integers from one through five", async () => {
  const { store } = fixture();
  for (const rating of [0, 6, 2.5, "5", null, true, NaN, Infinity, undefined]) {
    await assert.rejects(submitParentReview(store, parent, 47, { rating }), errorWithStatus(400));
  }
  for (const rating of [1, 2, 3, 4, 5]) {
    assert.equal((await submitParentReview(fixture().store, parent, 47, { rating })).rating, rating);
  }
});

test("comment type and length are validated and unknown ownership fields rejected", async () => {
  const { store } = fixture();
  for (const body of [
    null, [], { rating: 5, comment: 123 }, { rating: 5, comment: null },
    { rating: 5, comment: "a".repeat(2001) }, { rating: 5, tutorId: 999 },
    { rating: 5, authorId: 999 }, { rating: 5, sessionId: 999 },
  ]) {
    await assert.rejects(submitParentReview(store, parent, 47, body), errorWithStatus(400));
  }
  assert.equal((await submitParentReview(store, parent, 47, { rating: 5, comment: "a".repeat(2000) })).comment?.length, 2000);
});

test("successful reviews derive session, tutor and author on the server and survive a fresh read", async () => {
  const { store, saved } = fixture();
  assert.deepEqual(await getParentReview(store, parent, 47), { eligible: true, review: null });
  const review = await submitParentReview(store, parent, 47, { rating: 4, comment: "  Clear explanations  " });
  assert.deepEqual({ sessionId: review.sessionId, tutorId: review.tutorId, authorId: review.authorId },
    { sessionId: 47, tutorId: 16, authorId: 7 });
  assert.equal(review.comment, "Clear explanations");
  assert.deepEqual(await getParentReview(store, parent, 47), { eligible: false, review: saved() });
  await assert.rejects(submitParentReview(store, parent, 47, { rating: 5 }), errorWithStatus(409));
  assert.equal(saved()?.rating, 4);
});

test("empty optional comments are stored as null", async () => {
  assert.equal((await submitParentReview(fixture().store, parent, 47, { rating: 5, comment: "  " })).comment, null);
});

test("an existing review blocks a second review even when its author differs", async () => {
  const first = await submitParentReview(fixture().store, parent, 47, { rating: 5 });
  const { store } = fixture({}, { ...first, authorId: 20 });
  await assert.rejects(submitParentReview(store, parent, 47, { rating: 1 }), errorWithStatus(409));
});

test("two simultaneous submissions produce one review and one conflict", async () => {
  const { store, saved } = fixture();
  const results = await Promise.allSettled([
    submitParentReview(store, parent, 47, { rating: 5 }),
    submitParentReview(store, parent, 47, { rating: 1 }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected?.status === "rejected" && errorWithStatus(409)(rejected.reason));
  assert.ok(saved());
});

test("resource IDs reject partial, unsafe and noncanonical numbers", () => {
  for (const id of ["0", "-1", "1junk", "1e2", "1.2", "01", "2147483648", "9007199254740993", "", ["1"]]) {
    assert.throws(() => reviewResourceId(id), errorWithStatus(400));
  }
  assert.equal(reviewResourceId("47"), 47);
});

test("HTTP review endpoints use shared auth and storage uses a transaction-held session row lock", () => {
  const routes = readFileSync(new URL("../routes/reviews.ts", import.meta.url), "utf8");
  for (const method of ["get", "post"]) {
    assert.ok(routes.includes(`router.${method}("/sessions/:sessionId/reviews", requireAuth,`));
  }
  const storage = readFileSync(new URL("./sessionReviewStore.ts", import.meta.url), "utf8");
  assert.match(storage, /db\.transaction/);
  assert.match(storage, /query\.for\("update", \{ of: sessionsTable \}\)/);
  assert.match(storage, /isolationLevel: "read committed"/);
});
