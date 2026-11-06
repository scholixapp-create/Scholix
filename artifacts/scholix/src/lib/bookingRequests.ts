import type { QueryClient } from "@tanstack/react-query";
import {
  getListSessionsQueryKey,
  getGetSessionSummaryQueryKey,
  getListInvoicesQueryKey,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";

export function invalidateBookingQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
  qc.invalidateQueries({ queryKey: getGetSessionSummaryQueryKey() });
  qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
  qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
  // Generated keys include params as a second element; invalidate by URL prefix too.
  qc.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey[0];
      return typeof k === "string" && (k.startsWith("/api/sessions") || k.startsWith("/api/invoices") || k.startsWith("/api/payments"));
    },
  });
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { data?: { error?: string }; message?: string } | null;
  return e?.data?.error ?? fallback;
}

export function apiErrorStatus(err: unknown): number | undefined {
  return (err as { status?: number } | null)?.status;
}

export function lessonModeLabel(mode?: string | null): string {
  if (mode === "in_person") return "In-person";
  if (mode === "online") return "Online";
  return "Mode not set";
}

export const BOOKING_TIME_ZONE = "Australia/Melbourne";

/** Formats an instant in the given zone; defaults to Melbourne time with a zone abbreviation (AEST/AEDT). */
export function formatInZone(iso: string, timeZone?: string, opts?: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat("en-AU", {
      weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
      timeZone: timeZone ?? BOOKING_TIME_ZONE,
      ...(timeZone ? {} : { timeZoneName: "short" as const }),
      ...opts,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString("en-AU");
  }
}

export function timeLeft(iso?: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "expired";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min left`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m left`;
}
