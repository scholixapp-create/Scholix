// Pure navigation helpers. No app imports so tests can load this file directly.
// These only shape UI redirects; the backend remains the authorization guard.

export type AppRole = "tutor" | "parent" | "student" | "admin";

const TUTOR_PUBLIC = /^\/tutor\/(\d{1,9})$/;
const PARENT_BOOK = /^\/parent\/book\/(\d{1,9})$/;
const PARENT_REVIEW = /^\/parent\/dashboard\?reviewSession=(\d{1,9})$/;

export function dashboardFor(role: string | null | undefined): string {
  switch (role) {
    case "tutor": return "/tutor/dashboard";
    case "parent": return "/parent/dashboard";
    case "student": return "/student/dashboard";
    case "admin": return "/admin/dashboard";
    default: return "/";
  }
}

// Returns a normalized internal destination when the raw value is one of the
// small set of known destinations, otherwise null. Role is not trusted for
// security, only to avoid sending a non-parent into a parent-only redirect loop.
export function resolveSafeRedirect(raw: string | null | undefined, role?: string | null): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 200) return null;
  let value = raw;
  // Decode a few layers so encoded tricks (%2F%2F, %5C, %0A) are inspected too.
  for (let i = 0; i < 3; i++) {
    if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
    if (!/%[0-9a-f]{2}/i.test(value)) break;
    try { value = decodeURIComponent(value); } catch { return null; }
  }
  if (/[\u0000-\u001f\u007f\\%]/.test(value)) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/^\/(login|signup|forgot-password|reset-password)(\/|\?|$)/.test(value)) return null;

  const tutor = TUTOR_PUBLIC.exec(value);
  if (tutor && Number(tutor[1]) > 0) return value;

  const book = PARENT_BOOK.exec(value);
  if (book && Number(book[1]) > 0) {
    if (!role || role === "parent") return value;
    return `/tutor/${book[1]}`;
  }

  const review = PARENT_REVIEW.exec(value);
  if (review && Number(review[1]) > 0) {
    if (!role || role === "parent") return value;
    return dashboardFor(role);
  }
  return null;
}

export function postAuthDestination(raw: string | null | undefined, role: string): string {
  return resolveSafeRedirect(raw, role) ?? dashboardFor(role);
}

export function withRedirect(path: string, redirect: string | null | undefined): string {
  const safe = resolveSafeRedirect(redirect);
  return safe ? `${path}?redirect=${encodeURIComponent(safe)}` : path;
}

// Legacy share links used /tutors?id=ID.
export function legacyTutorRedirect(search: string): string | null {
  const id = new URLSearchParams(search).get("id");
  return id && /^\d{1,9}$/.test(id) && Number(id) > 0 ? `/tutor/${id}` : null;
}

// Per-document, per-history-entry tracking. Each entry created by this document
// carries { __sxNav: { doc, index } } merged into its existing state object.
// Pushes increment the index, replaces keep it, pops read it back. Entries from a
// previous document load or another site have no matching marker, so Back falls home.
const NAV_KEY = "__sxNav";
const DOC_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
let installed = false;

type NavMarker = { doc: string; index: number };

function readMarker(state: unknown): NavMarker | null {
  if (!state || typeof state !== "object") return null;
  const m = (state as Record<string, unknown>)[NAV_KEY] as NavMarker | undefined;
  return m && m.doc === DOC_ID && Number.isInteger(m.index) && m.index >= 0 ? m : null;
}

function withMarker(state: unknown, index: number): unknown {
  if (state !== null && state !== undefined && (typeof state !== "object" || Array.isArray(state))) return state;
  return { ...(state as Record<string, unknown> | null ?? {}), [NAV_KEY]: { doc: DOC_ID, index } };
}

export function currentHistoryIndex(): number {
  if (typeof window === "undefined") return -1;
  return readMarker(window.history.state)?.index ?? -1;
}

export function installHistoryTracking() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const h = window.history;
  const origPush = h.pushState;
  const origReplace = h.replaceState;
  // Mark the entry this document loaded into as index 0.
  if (!readMarker(h.state)) origReplace.call(h, withMarker(h.state, 0), "");
  h.pushState = function (state: unknown, unused: string, url?: string | URL | null) {
    const next = currentHistoryIndex() >= 0 ? currentHistoryIndex() + 1 : -1;
    return origPush.call(this, next >= 0 ? withMarker(state, next) : state, unused, url);
  };
  h.replaceState = function (state: unknown, unused: string, url?: string | URL | null) {
    const idx = currentHistoryIndex();
    return origReplace.call(this, idx >= 0 ? withMarker(state, idx) : state, unused, url);
  };
}

/** @deprecated kept for compatibility; tracking is history-entry based now. */
export function recordInternalNavigation() { installHistoryTracking(); }

export function canGoBackInternally(entries = currentHistoryIndex() + 1, historyLength = typeof window === "undefined" ? 0 : window.history.length) {
  return entries > 1 && historyLength > 1;
}
export function goBackOrHome(navigate: (to: string, opts?: { replace?: boolean }) => void) {
  if (canGoBackInternally()) window.history.back();
  else navigate("/", { replace: true });
}

// Older completion notifications point at /parent/sessions (never a real page).
// Send them to the completed-session review section, keeping a valid session ID.
export function legacyParentSessionsRedirect(search: string): string {
  const params = new URLSearchParams(search);
  const id = params.get("reviewSession") ?? params.get("sessionId") ?? params.get("id");
  return id && /^\d{1,9}$/.test(id) && Number(id) > 0
    ? `/parent/dashboard?reviewSession=${id}`
    : "/parent/dashboard?section=reviews";
}
