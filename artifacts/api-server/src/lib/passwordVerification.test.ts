import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcrypt";
import { createHash } from "node:crypto";
import { verifyStoredPassword } from "./passwordVerification";

test("password verification supports bcrypt and legacy account hashes", async () => {
  const password = "safe-test-password";
  const bcryptHash = await bcrypt.hash(password, 4);
  const legacyHash = createHash("sha256").update(password + "scholix_salt").digest("hex");

  assert.equal(await verifyStoredPassword(password, bcryptHash), true);
  assert.equal(await verifyStoredPassword("wrong-password", bcryptHash), false);
  assert.equal(await verifyStoredPassword(password, legacyHash), true);
  assert.equal(await verifyStoredPassword(password, "not-a-valid-hash"), false);
});
