import assert from "node:assert/strict";
import test from "node:test";
import {
  changeTutorCommissionWaiver,
  CommissionWaiverError,
  type CommissionWaiverActor,
  type CommissionWaiverAudit,
  type CommissionWaiverStore,
  type CommissionWaiverTransaction,
  type CommissionWaiverTutor,
} from "./adminCommissionWaiver";

class FakeStore implements CommissionWaiverStore {
  actor: CommissionWaiverActor | undefined = { id: 1, role: "admin", isActive: true };
  tutor: CommissionWaiverTutor | undefined = {
    id: 10,
    userId: 2,
    email: "tutor@example.test",
    firstName: "Test",
    lastName: "Tutor",
    role: "tutor",
    isActive: true,
    isApproved: true,
    commissionWaived: false,
  };
  readonly audit: CommissionWaiverAudit[] = [];

  async transaction<T>(operation: (tx: CommissionWaiverTransaction) => Promise<T>): Promise<T> {
    return operation({
      lockWaiverChanges: async () => {},
      findActor: async () => this.actor,
      findTutor: async () => this.tutor,
      setWaiver: async (_id, enabled) => {
        if (this.tutor) this.tutor.commissionWaived = enabled;
      },
      appendAudit: async (entry) => { this.audit.push(entry); },
    });
  }
}

const validInput = {
  actorUserId: 1,
  tutorId: 10,
  enabled: true,
  reason: "Approved commercial partnership terms.",
  confirmationEmail: "tutor@example.test",
};

test("only an active database admin can change a waiver", async () => {
  const store = new FakeStore();
  store.actor = { id: 1, role: "parent", isActive: true };
  await assert.rejects(
    changeTutorCommissionWaiver(store, validInput),
    (error: unknown) => error instanceof CommissionWaiverError && error.statusCode === 403,
  );
  assert.equal(store.tutor?.commissionWaived, false);
  assert.equal(store.audit.length, 0);
});

test("waiver requires an active approved tutor and exact account confirmation", async () => {
  const store = new FakeStore();
  store.tutor = { ...store.tutor!, isActive: false };
  await assert.rejects(
    changeTutorCommissionWaiver(store, validInput),
    (error: unknown) => error instanceof CommissionWaiverError && error.statusCode === 409,
  );
  store.tutor = { ...store.tutor!, isActive: true, isApproved: false };
  await assert.rejects(changeTutorCommissionWaiver(store, validInput), CommissionWaiverError);
  store.tutor = { ...store.tutor!, isApproved: true };
  await assert.rejects(
    changeTutorCommissionWaiver(store, { ...validInput, confirmationEmail: "wrong@example.test" }),
    (error: unknown) => error instanceof CommissionWaiverError && error.statusCode === 400,
  );
  assert.equal(store.audit.length, 0);
});

test("grant and revoke append reasons while repeated state changes do not", async () => {
  const store = new FakeStore();
  const granted = await changeTutorCommissionWaiver(store, validInput);
  assert.equal(granted.commissionWaived, true);
  assert.equal(granted.changed, true);
  assert.equal(store.audit[0]?.action, "commission_waiver_granted");
  assert.equal(store.audit[0]?.reason, validInput.reason);

  const repeated = await changeTutorCommissionWaiver(store, validInput);
  assert.equal(repeated.changed, false);
  assert.equal(store.audit.length, 1);

  const revoked = await changeTutorCommissionWaiver(store, {
    ...validInput,
    enabled: false,
    reason: "Commercial agreement has ended.",
  });
  assert.equal(revoked.commissionWaived, false);
  assert.equal(store.audit[1]?.action, "commission_waiver_revoked");
  assert.equal(store.audit[1]?.reason, "Commercial agreement has ended.");
});

test("waiver reason is mandatory and bounded", async () => {
  const store = new FakeStore();
  await assert.rejects(
    changeTutorCommissionWaiver(store, { ...validInput, reason: "short" }),
    (error: unknown) => error instanceof CommissionWaiverError && error.statusCode === 400,
  );
  assert.equal(store.audit.length, 0);
});
