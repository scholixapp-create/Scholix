import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
// Exercise the browser helper at runtime without pulling a separate browser
// TypeScript project into the API's rootDir. Its types are checked by Scholix.
const { documentPreviewType, openProtectedDocument } = await import(
  new URL("../../../scholix/src/lib/protectedDocument.ts", import.meta.url).href
);

test("document previews identify supported bytes rather than trusting a filename", () => {
  assert.equal(documentPreviewType(new TextEncoder().encode("%PDF-1.7\n")), "application/pdf");
  assert.equal(documentPreviewType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
  assert.equal(documentPreviewType(new Uint8Array([255, 216, 255])), "image/jpeg");
  assert.equal(documentPreviewType(new TextEncoder().encode("RIFF1234WEBP")), "image/webp");
  assert.equal(documentPreviewType(new TextEncoder().encode("<html><script>")), null);
  assert.equal(documentPreviewType(new Uint8Array()), null);
});

async function mockDocumentBrowser(response: Response, check: (state: {
  opened: number;
  closed: boolean;
  location: string;
  requests: number;
}) => Promise<void>) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalFetch = globalThis.fetch;
  const state = { opened: 0, closed: false, location: "", requests: 0 };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      open: () => {
        state.opened++;
        return {
          opener: null, close: () => { state.closed = true; },
          addEventListener: () => {},
          document: {
            title: "",
            createElement: (tag: string) => ({ tag, style: {}, src: "", href: "", download: "", textContent: "" }),
            body: {
              style: {}, textContent: "",
              replaceChildren: (...elements: { tag: string; src: string; href: string }[]) => {
                state.location = elements.find((element) => element.tag === "iframe" || element.tag === "img")?.src ?? "";
                const download = elements.find((element) => element.tag === "a");
                assert.equal(download?.href, state.location);
              },
            },
          },
        };
      },
      setTimeout: (callback: () => void) => { callback(); return 0; },
    },
  });
  globalThis.fetch = async (input, init) => {
    state.requests++;
    assert.equal(input, "/api/admin/documents/42");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-only-token");
    assert.equal(init?.cache, "no-store");
    return response;
  };
  try { await check(state); } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("document requests send auth in headers and open a local, typed blob", async () => {
  await mockDocumentBrowser(new Response("%PDF-1.7\n"), async (state) => {
    await openProtectedDocument(42, "test-only-token");
    assert.equal(state.requests, 1);
    assert.match(state.location, /^blob:/);
    assert.equal(state.location.includes("test-only-token"), false);
    assert.equal(state.closed, false);
  });
});

test("missing documents close the blank tab and show the API's explanation", async () => {
  await mockDocumentBrowser(Response.json({ error: "Please re-upload the document" }, { status: 404 }), async (state) => {
    await assert.rejects(openProtectedDocument(42, "test-only-token"), /re-upload/);
    assert.equal(state.closed, true);
    assert.equal(state.location, "");
  });
});

test("unauthorized document requests do not expose a file", async () => {
  await mockDocumentBrowser(Response.json({ error: "Admin access required" }, { status: 403 }), async (state) => {
    await assert.rejects(openProtectedDocument(42, "test-only-token"), /Admin access required/);
    assert.equal(state.closed, true);
    assert.equal(state.location, "");
  });
});

test("active HTML cannot be opened as a document preview", async () => {
  await mockDocumentBrowser(new Response("<html><script>alert(1)</script></html>"), async (state) => {
    await assert.rejects(openProtectedDocument(42, "test-only-token"), /valid document/);
    assert.equal(state.closed, true);
    assert.equal(state.location, "");
  });
});

test("signed-out users do not make a document request or open a tab", async () => {
  await mockDocumentBrowser(new Response(""), async (state) => {
    await assert.rejects(openProtectedDocument(42, null), /sign in again/);
    assert.equal(state.requests, 0);
    assert.equal(state.opened, 0);
  });
});

test("documents remain protected by server-side admin middleware", async () => {
  const source = await readFile(new URL("../routes/verification.ts", import.meta.url), "utf8");
  assert.match(source, /router\.get\("\/admin\/documents\/:docId", requireAdmin,/);
  assert.match(source, /Cache-Control", "private, no-store"/);
});

test("every sidebar destination has a route and the homepage no longer redirects members", async () => {
  const base = new URL("../../../scholix/src/", import.meta.url);
  const [layout, app, home] = await Promise.all([
    readFile(new URL("components/Layout.tsx", base), "utf8"),
    readFile(new URL("App.tsx", base), "utf8"),
    readFile(new URL("pages/Home.tsx", base), "utf8"),
  ]);
  const routes = new Set([...app.matchAll(/path="([^"]+)"/g)].map((match) => match[1]));
  for (const [, destination] of layout.matchAll(/href: "(\/[^"]*)"/g)) {
    assert.ok(routes.has(destination), `Missing sidebar route: ${destination}`);
  }
  assert.doesNotMatch(layout, /href: "\/", label: "Scholix home"/);
  assert.match(layout, /href="\/"[^>]*aria-label="Scholix home"/);
  assert.doesNotMatch(home.split("export default function Home()")[1], /navigate\(/);
  assert.doesNotMatch(home, /200\+|1,240|98%|4\.9★|My income has doubled/);
});
