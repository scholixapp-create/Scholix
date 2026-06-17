---
name: OTP login flow
description: How the 2-step email OTP login is implemented in Scholix.
---

Login is a 2-step flow — credentials → OTP code → session token.

**Step 1:** `POST /auth/login` validates email/password, generates a 6-digit OTP, stores `sha256(otp)` in `auth_otp_tokens`, sends it via email, and returns `{requiresOtp: true, pendingUserId, email}`. No token is issued yet.

**Step 2:** `POST /auth/verify-otp` takes `{pendingUserId, otp}`, validates the hash matches an unexpired, unused row in `auth_otp_tokens`, marks it used, and returns `{user, token}`.

**Resend:** `POST /auth/resend-otp` with `{pendingUserId}` — same rate limit as login (3 per 10 min).

**Rate limit:** Count rows in `auth_otp_tokens` where `userId = X` and `createdAt > (now - 10min)`. Return 429 if >= 3.

**Invalidation:** On each new OTP request, UPDATE all rows where `userId = X AND usedAt IS NULL` to set `usedAt = now`.

**Frontend:** Login.tsx manages both steps with local state (`step: "credentials" | "otp"`). OTP input is 6 individual digit boxes with paste support.

**Why:** Provides email 2FA without a separate authenticator app. The OTP is short-lived (10 min) and single-use. Signup bypasses OTP and returns a token directly (no 2FA on first signup).
