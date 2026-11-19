import bcrypt from "bcrypt";
import { createHash, timingSafeEqual } from "node:crypto";

function legacyHashPassword(password: string): string {
  return createHash("sha256").update(password + "scholix_salt").digest("hex");
}

export async function verifyStoredPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$2")) {
    return bcrypt.compare(password, stored);
  }

  // Preserve access for legacy accounts while comparing their fixed-length hashes safely.
  if (!/^[a-f0-9]{64}$/i.test(stored)) return false;
  const actual = Buffer.from(stored, "hex");
  const expected = Buffer.from(legacyHashPassword(password), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
