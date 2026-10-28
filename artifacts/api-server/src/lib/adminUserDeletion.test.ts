import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminUserDeletionError,
  deleteAdminUser,
  type AdminUserDeletionRecord,
  type AdminUserDeletionStore,
  type AdminUserDeletionTransaction,
} from "./adminUserDeletion";

class FakeDeletionStore implements AdminUserDeletionStore {
  readonly users = new Map<number, AdminUserDeletionRecord>();
  readonly blockers = new Map<number, string[]>();
  readonly audit: Array<{
    actorUserId: number;
    targetUserId: number;
    targetEmail: string;
  }> = [];
  private lockTail: Promise<void> = Promise.resolve();

  async transaction<T>(
    operation: (tx: AdminUserDeletionTransaction) => Promise<T>,
  ): Promise<T> {
    let unlock: (() => void) | undefined;
    const tx: AdminUserDeletionTransaction = {
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
      findDeletionBlockers: async (userId) => this.blockers.get(userId) ?? [],
      deleteAccount: async (userId) => {
        this.users.delete(userId);
      },
      appendDeletionAudit: async (entry) => {
        this.audit.push(entry);
      },
    };

    try {
      return await operation(tx);
    } finally {
      unlock?.();
    }
  }
}

function makeStore(): FakeDeletionStore {
  const store = new FakeDeletionStore();
  store.users.set(1, { id: 1, email: "admin@example.test", role: "admin", isActive: true });
  store.users.set(2, { id: 2, email: "backup-admin@example.test", role: "admin", isActive: true });
  store.users.set(3, { id: 3, email: "signup-test@example.test", role: "parent", isActive: true });
  return store;
}

test("deletion requires an active database admin", async () => {
  const store = makeStore();
  store.users.set(1, { ...store.users.get(1)!, role: "parent" });
  await assert.rejects(
    deleteAdminUser(store, 1, 3),
    (error: unknown) => error instanceof AdminUserDeletionError && error.statusCode === 403,
  );
  assert.equal(store.users.has(3), true);
  assert.equal(store.audit.length, 0);
});

test("an admin cannot delete their own account", async () => {
  const store = makeStore();
  await assert.rejects(
    deleteAdminUser(store, 1, 1),
    (error: unknown) => error instanceof AdminUserDeletionError && error.statusCode === 400,
  );
  assert.equal(store.users.has(1), true);
  assert.equal(store.audit.length, 0);
});

test("durable dependent records reject deletion with a clear reason", async () => {
  const store = makeStore();
  store.blockers.set(3, ["payment or invoice history", "reviews"]);
  await assert.rejects(
    deleteAdminUser(store, 1, 3),
    (error: unknown) => error instanceof AdminUserDeletionError
      && error.statusCode === 409
      && error.message.includes("payment or invoice history")
      && error.message.includes("Use deactivation instead"),
  );
  assert.equal(store.users.has(3), true);
  assert.equal(store.audit.length, 0);
});

test("eligible account deletion appends an audit record that survives the user row", async () => {
  const store = makeStore();
  await deleteAdminUser(store, 1, 3);

  assert.equal(store.users.has(3), false);
  assert.deepEqual(store.audit, [{
    actorUserId: 1,
    targetUserId: 3,
    targetEmail: "signup-test@example.test",
  }]);
});

test("concurrent deletion requests cannot remove every active admin", async () => {
  const store = makeStore();
  const results = await Promise.allSettled([
    deleteAdminUser(store, 1, 2),
    deleteAdminUser(store, 2, 1),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal([...store.users.values()].filter((user) => user.role === "admin" && user.isActive).length, 1);
  assert.equal(store.audit.length, 1);
});
