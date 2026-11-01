import assert from "node:assert/strict";
import { test } from "node:test";
import { passwordResetLink } from "./passwordResetLink";

test("reset links use the configured frontend, not an API or Replit hostname", () => {
  assert.equal(passwordResetLink("https://scholix.example/", "abc123"),
    "https://scholix.example/reset-password?token=abc123");
});

test("reset links retain a frontend base path and encode token values", () => {
  const url = new URL(passwordResetLink("https://frontend.example/app/", "a+b&c"));
  assert.equal(url.pathname, "/app/reset-password");
  assert.equal(url.searchParams.get("token"), "a+b&c");
});

test("reset links reject non-web protocols", () => {
  assert.throws(() => passwordResetLink("javascript:bad", "token"));
});
