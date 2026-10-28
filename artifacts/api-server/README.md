# Scholix API Server

## Authentication tokens

The API signs access tokens with the server-only `SESSION_SECRET`. Set it to a random value of at least 32 bytes in the API service environment. The API refuses to start when this secret is missing or too short.

Access tokens use HS256 and expire after 15 minutes. Authorization roles are loaded from the current database user record, not trusted from token claims.

These signed tokens are not stored server-side, so logout clears the browser's copy but cannot immediately revoke a copied token. It remains usable until it expires. Rotating `SESSION_SECRET` invalidates all existing tokens and requires users to sign in again.

The password-and-OTP login flow issues a token only after a valid, unexpired, unused OTP is atomically consumed. New accounts must complete that same OTP step before receiving a token.
