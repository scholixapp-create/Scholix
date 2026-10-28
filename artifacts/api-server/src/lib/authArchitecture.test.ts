import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routesRoot = path.join(sourceRoot, "routes");

async function sourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(entryPath)));
    else if (entry.name.endsWith(".ts")) files.push(entryPath);
  }
  return files;
}

test("API route sources contain no route-local Base64 bearer decoders", async () => {
  const files = [...(await sourceFiles(routesRoot)), path.join(sourceRoot, "lib", "authMiddleware.ts")];
  const decoderPattern = /Buffer\.from\([^)]*(?:authorization|authHeader|auth\.slice|token)[^)]*,\s*["']base64["']/s;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, decoderPattern, `legacy bearer parser remains in ${path.relative(sourceRoot, file)}`);
  }
});

test("only successful OTP verification issues a session token", async () => {
  const source = await readFile(path.join(routesRoot, "auth.ts"), "utf8");
  const verifyStart = source.indexOf('router.post("/auth/verify-otp"');
  const resendStart = source.indexOf('router.post("/auth/resend-otp"');
  const issueCalls = [...source.matchAll(/issueAccessToken\s*\(/g)].map((match) => match.index ?? -1);

  assert.ok(verifyStart >= 0 && resendStart > verifyStart);
  assert.equal(issueCalls.length, 1);
  assert.ok(issueCalls[0] > verifyStart && issueCalls[0] < resendStart);
  assert.ok(source.lastIndexOf("if (!otpRecord)", issueCalls[0]) > verifyStart);
  assert.match(
    source.slice(verifyStart, issueCalls[0]),
    /if \(!user \|\| !user\.isActive\)/,
  );
  assert.doesNotMatch(
    source.slice(
      source.indexOf('router.post("/auth/signup"'),
      source.indexOf('router.get("/auth/me"'),
    ),
    /issueAccessToken\s*\(/,
  );
});

test("OTP verification checks expiry and one-time use before token issuance", async () => {
  const source = await readFile(path.join(routesRoot, "auth.ts"), "utf8");
  const verifyStart = source.indexOf('router.post("/auth/verify-otp"');
  const verifyEnd = source.indexOf('router.post("/auth/resend-otp"');
  const otpRoute = source.slice(verifyStart, verifyEnd);

  assert.match(otpRoute, /\.update\(authOtpTokensTable\)/);
  assert.match(otpRoute, /gt\(authOtpTokensTable\.expiresAt,\s*now\)/);
  assert.match(otpRoute, /isNull\(authOtpTokensTable\.usedAt\)/);
  assert.match(otpRoute, /set\(\{\s*usedAt:\s*now\s*\}\)/);
  assert.match(otpRoute, /\.returning\(\{\s*id:\s*authOtpTokensTable\.id\s*\}\)/);
  assert.ok(otpRoute.indexOf("usedAt: now") < otpRoute.indexOf("issueAccessToken"));
});

test("admin middleware verifies the token, loads the current user, and checks the database role", async () => {
  const source = await readFile(path.join(sourceRoot, "lib", "authMiddleware.ts"), "utf8");
  assert.match(source, /verifyAccessToken\(req\.headers\.authorization\)/);
  assert.match(source, /\.where\(eq\(usersTable\.id,\s*userId\)\)/);
  assert.match(source, /!user\.isActive/);
  assert.match(source, /isAdminRole\(user\.role\)/);
  assert.match(source, /getUserIdFromBearer[\s\S]*?usersTable\.isActive/);
});

test("admin user endpoints are guarded and status changes are audited transactionally", async () => {
  const routeSource = await readFile(path.join(routesRoot, "admin.ts"), "utf8");
  const serviceSource = await readFile(path.join(sourceRoot, "lib", "adminUserManagement.ts"), "utf8");
  const storeSource = await readFile(path.join(sourceRoot, "lib", "adminUserManagementStore.ts"), "utf8");
  assert.match(routeSource, /req\.path\.startsWith\("\/admin"\)[\s\S]*?requireAdmin/);
  assert.match(routeSource, /router\.get\("\/admin\/users"/);
  assert.match(routeSource, /router\.get\("\/admin\/users\/:userId"/);
  assert.match(routeSource, /router\.patch\("\/admin\/users\/:userId\/status"/);
  assert.match(routeSource, /changeAdminUserStatus/);
  assert.match(serviceSource, /actorUserId === targetUserId/);
  assert.match(serviceSource, /countActiveAdmins\(\) <= 1/);
  assert.match(serviceSource, /appendAudit/);
  assert.match(storeSource, /pg_advisory_xact_lock/);
  assert.match(storeSource, /db\.transaction/);
});

test("authentication and token issuance paths reject inactive accounts", async () => {
  const source = await readFile(path.join(routesRoot, "auth.ts"), "utf8");
  const middlewareSource = await readFile(path.join(sourceRoot, "lib", "authMiddleware.ts"), "utf8");
  assert.match(source, /if \(!user\.isActive\)[\s\S]*?This account is inactive/);
  assert.match(source, /\.for\("update"\)[\s\S]*?if \(!user \|\| !user\.isActive\)/);
  assert.match(middlewareSource, /if \(!user \|\| !user\.isActive\)/);
});

test("authenticated route families use shared middleware or the shared token verifier", async () => {
  const middlewareRoutes = ["auth.ts", "notifications.ts", "settings.ts", "academy.ts", "verification.ts"];
  for (const fileName of middlewareRoutes) {
    const source = await readFile(path.join(routesRoot, fileName), "utf8");
    assert.match(source, /requireAuth|requireAdmin/, `${fileName} must use shared authentication middleware`);
  }

  for (const fileName of ["tutors.ts", "sessions.ts"]) {
    const source = await readFile(path.join(routesRoot, fileName), "utf8");
    assert.match(source, /getUserIdFromBearer/, `${fileName} must use the shared signed-token verifier`);
  }
});

test("signup creates an OTP challenge instead of returning an access token", async () => {
  const source = await readFile(path.join(routesRoot, "auth.ts"), "utf8");
  const signupStart = source.indexOf('router.post("/auth/signup"');
  const signupEnd = source.indexOf('router.get("/auth/me"');
  const signupRoute = source.slice(signupStart, signupEnd);

  assert.match(signupRoute, /insert\(authOtpTokensTable\)/);
  assert.match(signupRoute, /sendEmail\(/);
  assert.match(signupRoute, /requiresOtp:\s*true/);
  assert.match(signupRoute, /pendingUserId:\s*user\.id/);
  assert.doesNotMatch(signupRoute, /issueAccessToken\s*\(/);
});
