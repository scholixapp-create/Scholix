import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT, decodeJwt } from "jose";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_TOKEN_AUDIENCE,
  AUTH_TOKEN_ISSUER,
  assertAuthTokenSecret,
  generateOtp,
  issueAccessToken,
  verifyAccessToken,
} from "./authTokens";
import { isAdminRole } from "./authPolicy";

const testSecret = "test-only-secret-with-at-least-32-bytes";
const testKey = new TextEncoder().encode(testSecret);

async function buildToken(
  subject: string,
  payload: Record<string, unknown> = {},
  options: { issuedAt?: number; expiresAt?: number; secret?: Uint8Array } = {},
) {
  const now = Math.floor(Date.now() / 1000);
  const issuedAt = options.issuedAt ?? now;
  const token = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject)
    .setIssuedAt(issuedAt)
    .setIssuer(AUTH_TOKEN_ISSUER)
    .setAudience(AUTH_TOKEN_AUDIENCE)
    .setExpirationTime(options.expiresAt ?? issuedAt + ACCESS_TOKEN_TTL_SECONDS);
  return token.sign(options.secret ?? testKey);
}

test("issues signed access tokens with required claims and a 15-minute lifetime", async () => {
  const token = await issueAccessToken(42, testSecret);
  const payload = decodeJwt(token);

  assert.equal(payload.sub, "42");
  assert.equal(payload.iss, AUTH_TOKEN_ISSUER);
  assert.equal(payload.aud, AUTH_TOKEN_AUDIENCE);
  assert.equal(typeof payload.iat, "number");
  assert.equal(payload.exp! - payload.iat!, ACCESS_TOKEN_TTL_SECONDS);
  assert.equal("role" in payload, false);
  assert.equal(await verifyAccessToken(`Bearer ${token}`, testSecret), 42);
});

test("rejects legacy Base64 user ID tokens", async () => {
  const legacyToken = Buffer.from("42:any-timestamp").toString("base64");
  assert.equal(await verifyAccessToken(`Bearer ${legacyToken}`, testSecret), null);
});

test("rejects expired tokens", async () => {
  const now = Math.floor(Date.now() / 1000);
  const token = await buildToken("42", {}, { issuedAt: now - 120, expiresAt: now - 60 });
  assert.equal(await verifyAccessToken(`Bearer ${token}`, testSecret), null);
});

test("rejects altered payloads and incorrect signing keys", async () => {
  const token = await buildToken("42");
  const [header, encodedPayload, signature] = token.split(".");
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  payload.sub = "7";
  const altered = `${header}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;

  assert.equal(await verifyAccessToken(`Bearer ${altered}`, testSecret), null);
  assert.equal(await verifyAccessToken(`Bearer ${token}`, `${testSecret}-wrong`), null);
});

test("rejects malformed tokens and unsupported algorithms", async () => {
  const token = await buildToken("42");
  const [header, payload, signature] = token.split(".");
  const alteredHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");

  assert.equal(await verifyAccessToken("Bearer not-a-jwt", testSecret), null);
  assert.equal(await verifyAccessToken(`Bearer ${alteredHeader}.${payload}.${signature}`, testSecret), null);
});

test("requires a signing secret at least 32 bytes long", () => {
  assert.throws(() => assertAuthTokenSecret(""), /SESSION_SECRET/);
  assert.throws(() => assertAuthTokenSecret("too-short"), /32 bytes/);
  assert.doesNotThrow(() => assertAuthTokenSecret(testSecret));
});

test("generates six-digit OTPs in the allowed range", () => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const otp = generateOtp();
    assert.match(otp, /^\d{6}$/);
    assert.ok(Number(otp) >= 100_000 && Number(otp) < 1_000_000);
  }
});

test("admin access is decided by the database role, not a token role claim", async () => {
  const tokenWithClientRole = await buildToken("42", { role: "admin" });
  assert.equal(await verifyAccessToken(`Bearer ${tokenWithClientRole}`, testSecret), 42);
  assert.equal(isAdminRole("parent"), false);
  assert.equal(isAdminRole("tutor"), false);
  assert.equal(isAdminRole("admin"), true);
});
