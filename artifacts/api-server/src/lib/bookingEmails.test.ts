import test from "node:test";
import assert from "node:assert/strict";
import { bookingStatusEmailHtml } from "./email";

test("booking lifecycle email is branded, honest about beta payments and escapes supplied text", () => {
  const html = bookingStatusEmailHtml({
    title: "Awaiting tutor confirmation <script>",
    message: 'Mathematics with <img src=x onerror="alert(1)">',
    actionUrl: "https://example.test/parent",
  });
  for (const colour of ["#faf7f0", "#0f2747", "#0e8b6b", "#d4a850"]) assert.ok(html.includes(colour));
  assert.match(html, /No real card is charged/);
  assert.match(html, /authorisations, captures and releases are simulated/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
});
