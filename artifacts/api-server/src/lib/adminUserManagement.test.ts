import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminUserStatusError,
  changeAdminUserStatus,
  type AdminUserStatusAction,
  type AdminUserStatusRecord,
  type AdminUserStatusStore,
  type AdminUserStatusTransaction,
} from "./adminUserManagement";

class FakeStatusStore implements AdminUserStatusStore {
  readonly users = new Map<number, AdminUserStatusRecord>();
  readonly audit: Array<{ actorUserId: number; targetUserId: number; action: AdminUserStatusAction }> = [];
  private lockTail: Promise<void> = Promise.resolve();

  async transaction<T>(operation: (tx: AdminUserStatusTransaction) => Promise<T>): Promise<T> {
    let unlock: (() => void) | undefined;
    const tx: AdminUserStatusTransaction = {
      lockStatusChanges: async () => {
        const previous = this.lockTail;
        this.lockTail = new Promise<void>((resolve) => { unlock = resolve; });
        await previous;
      },
      findUser: async (userId) => {
        const user = this.users.get(userId);
        return user ? { ...user } : undefined;
      },
      countActiveAdmins: async () => [...this.users.values()]
        .filter((user) => user.role === "admin" && user.isActive).length,
      setUserActive: async (userId, isActive) => {
        const user = this.users.get(userId);
        if (user) this.users.set(userId, { ...user, isActive });
      },
      appendAudit: async (entry) => { this.audit.push(entry); },
    };

    try {
      return await operation(tx);
    } finally {
      unlock?.();
    }
  }
}

function makeStore(): FakeStatusStore {
  const store = new FakeStatusStore();
  store.users.set(1, { id: 1, role: "admin", isActive: true });
  store.users.set(2, { id: 2, role: "admin", isActive: true });
  store.users.set(3, { id: 3, role: "parent", isActive: true });
  return store;
}

test("status changes require a currently active database admin", async () => {
  const store = makeStore();
  store.users.set(1, { id: 1, role: "parent", isActive: true });
  await assert.rejects(
    changeAdminUserStatus(store, 1, 3, false),
    (error: unknown) => error instanceof AdminUserStatusError && error.statusCode === 403,
  );
  assert.equal(store.users.get(3)?.isActive, true);
  assert.equal(store.audit.length, 0);
});

test("an admin cannot change their own account status", async () => {
  const store = makeStore();
  await assert.rejects(
    changeAdminUserStatus(store, 1, 1, false),
    (error: unknown) => error instanceof AdminUserStatusError && error.statusCode === 400,
  );
  assert.equal(store.users.get(1)?.isActive, true);
});

test("the sole active admin cannot be deactivated", async () => {
  const store = makeStore();
  store.users.set(2, { id: 2, role: "admin", isActive: false });
  await assert.rejects(
    changeAdminUserStatus(store, 1, 1, false),
    (error: unknown) => error instanceof AdminUserStatusError && error.statusCode === 409,
  );
  assert.equal(store.users.get(1)?.isActive, true);
  assert.equal(store.audit.length, 0);
});

test("deactivation and reactivation update status and append audit entries", async () => {
  const store = makeStore();
  const deactivated = await changeAdminUserStatus(store, 1, 3, false);
  const reactivated = await changeAdminUserStatus(store, 1, 3, true);

  assert.equal(deactivated.isActive, false);
  assert.equal(reactivated.isActive, true);
  assert.deepEqual(store.audit, [
    { actorUserId: 1, targetUserId: 3, action: "deactivated" },
    { actorUserId: 1, targetUserId: 3, action: "reactivated" },
  ]);
});

test("concurrent admin deactivations leave at least one active admin", async () => {
  const store = makeStore();
  const results = await Promise.allSettled([
    changeAdminUserStatus(store, 1, 2, false),
    changeAdminUserStatus(store, 2, 1, false),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(
    [...store.users.values()].filter((user) => user.role === "admin" && user.isActive).length,
    1,
  );
  assert.equal(store.audit.length, 1);
});

test("repeating the current status does not create a misleading audit entry", async () => {
  const store = makeStore();
  await changeAdminUserStatus(store, 1, 3, true);
  assert.equal(store.audit.length, 0);
});
