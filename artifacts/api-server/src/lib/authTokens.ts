import { randomInt } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const AUTH_TOKEN_ISSUER = "scholix-api";
export const AUTH_TOKEN_AUDIENCE = "scholix-client";

function signingKey(secret: string | undefined = process.env["SESSION_SECRET"]): Uint8Array {
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 bytes for authentication tokens");
  }
  return new TextEncoder().encode(secret);
}

export function assertAuthTokenSecret(secret: string | undefined = process.env["SESSION_SECRET"]): void {
  signingKey(secret);
}

export function generateOtp(): string {
  return randomInt(100_000, 1_000_000).toString();
}

export async function issueAccessToken(
  userId: number,
  secret: string | undefined = process.env["SESSION_SECRET"],
): Promise<string> {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("A positive integer user ID is required to issue an authentication token");
  }

  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setIssuer(AUTH_TOKEN_ISSUER)
    .setAudience(AUTH_TOKEN_AUDIENCE)
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(signingKey(secret));
}

export async function verifyAccessToken(
  authorization: string | undefined,
  secret: string | undefined = process.env["SESSION_SECRET"],
): Promise<number | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token || /\s/.test(token)) return null;

  let key: Uint8Array;
  try {
    key = signingKey(secret);
  } catch {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: AUTH_TOKEN_ISSUER,
      audience: AUTH_TOKEN_AUDIENCE,
      maxTokenAge: `${ACCESS_TOKEN_TTL_SECONDS}s`,
    });

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== "string" ||
      !/^[1-9]\d*$/.test(payload.sub) ||
      !Number.isSafeInteger(Number(payload.sub)) ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.iat > nowSeconds ||
      payload.exp <= nowSeconds ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > ACCESS_TOKEN_TTL_SECONDS
    ) {
      return null;
    }

    return Number(payload.sub);
  } catch {
    return null;
  }
}
