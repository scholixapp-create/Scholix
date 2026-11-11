import { useAuth } from "@/context/AuthContext";
import {
  useListSessions, useGetSessionSummary, useGetSessionReview, getGetSessionReviewQueryKey, useCancelSession, useSimulatePayment,
  getListSessionsQueryKey, getGetSessionSummaryQueryKey, type Session,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateBookingQueries, apiErrorMessage, formatInZone, lessonModeLabel, timeLeft } from "@/lib/bookingRequests";
import { Link, useLocation, useSearch } from "wouter";
import { useEffect, useMemo, useRef, useState } from "react";
import SessionReviewDialog from "@/components/SessionReviewDialog";
import StatusBadge from "@/components/StatusBadge";
import { Calendar, GraduationCap, Bell, ChevronRight, Star, AlertCircle, Hourglass, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

function TutorReviewButton({ session, onOpen }: { session: Session; onOpen: () => void }) {
  const state = useGetSessionReview(session.id, { query: { queryKey: getGetSessionReviewQueryKey(session.id), retry: false } });
  const reviewed = !!state.data?.review;
  const tutor = session.tutorName ?? "tutor";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:border-brand-teal hover:text-brand-teal transition-colors"
      aria-label={reviewed ? `View your review of ${tutor}` : `Review ${tutor}`}
      data-testid={`button-review-session-${session.id}`}
    >
      <Star size={13} className={reviewed ? "fill-amber-400 text-amber-400" : ""} /> {reviewed ? "Your review" : "Review tutor"}
    </button>
  );
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sessions = useListSessions(undefined, {
    query: { queryKey: getListSessionsQueryKey(), refetchInterval: 30_000, refetchOnMount: "always", refetchOnWindowFocus: true },
  });
  const summary = useGetSessionSummary(undefined, {
    query: { queryKey: getGetSessionSummaryQueryKey(), refetchInterval: 30_000, refetchOnMount: "always" },
  });
  const cancelMutation = useCancelSession();
  const acceptTutorOfferMutation = useSimulatePayment();
  const [actionError, setActionError] = useState<{ id: number; msg: string } | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setTick((n) => n + 1), 30_000); return () => window.clearInterval(t); }, []);

  const requests = useMemo(
    () => (sessions.data ?? [])
      .filter((s) => s.status === "pending_confirmation" || s.status === "pending_payment")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [sessions.data],
  );
  const recentUpdates = useMemo(
    () => (sessions.data ?? [])
      .filter((s) => s.status === "cancelled")
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, 4),
    [sessions.data],
  );

  const withdraw = (session: Session) => {
    const verb = session.status === "pending_payment" ? "Cancel this unfinished checkout?" : "Withdraw this request? The simulated hold will be released.";
    if (!confirm(verb)) return;
    setActionError(null);
    setCancellingId(session.id);
    cancelMutation.mutate({ sessionId: session.id }, {
      onSuccess: () => invalidateBookingQueries(qc),
      onError: (err) => {
        setActionError({ id: session.id, msg: apiErrorMessage(err, "Could not withdraw. It may already have been decided. Refreshing.") });
        invalidateBookingQueries(qc);
      },
      onSettled: () => setCancellingId(null),
    });
  };

  const acceptTutorOffer = (session: Session) => {
    setActionError(null);
    acceptTutorOfferMutation.mutate({ data: { sessionId: session.id } }, {
      onSuccess: () => invalidateBookingQueries(qc),
      onError: (error) => setActionError({
        id: session.id,
        msg: apiErrorMessage(error, "Could not accept this lesson offer. Refresh and try again."),
      }),
    });
  };

  const upcoming = sessions.data
    ?.filter((s) => s.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5) ?? [];

  const completed = useMemo(
    () => (sessions.data ?? [])
      .filter((s) => s.status === "completed")
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [sessions.data],
  );
  // One review entry per tutor: the most recent completed session represents the pair.
  const reviewTargetIds = useMemo(() => {
    const seen = new Set<number>();
    const ids = new Set<number>();
    for (const s of completed) {
      if (!seen.has(s.tutorId)) { seen.add(s.tutorId); ids.add(s.id); }
    }
    return ids;
  }, [completed]);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const visibleCompleted = showAllCompleted ? completed : completed.slice(0, 3);

  const [, navigate] = useLocation();
  const search = useSearch();
  const [reviewSessionId, setReviewSessionId] = useState<number | null>(null);
  const [deepLinkError, setDeepLinkError] = useState("");
  const handledDeepLink = useRef<string | null>(null);
  const reviewSession = completed.find((s) => s.id === reviewSessionId) ?? null;

  useEffect(() => {
    const raw = new URLSearchParams(search).get("reviewSession");
    if (!raw || handledDeepLink.current === raw || !sessions.data) return;
    handledDeepLink.current = raw;
    const id = /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
    const match = sessions.data.find((s) => s.id === id);
    if (match && match.status === "completed") {
      setDeepLinkError("");
      setReviewSessionId(match.id);
    } else {
      setDeepLinkError("That session is not available to review. It may not be completed yet or may belong to another account.");
    }
  }, [search, sessions.data]);

  const completedSectionRef = useRef<HTMLDivElement | null>(null);
  const wantsReviewSection = new URLSearchParams(search).get("section") === "reviews";
  useEffect(() => {
    if (wantsReviewSection && sessions.data) completedSectionRef.current?.scrollIntoView({ block: "start" });
  }, [wantsReviewSection, sessions.data]);

  const closeReview = () => {
    setReviewSessionId(null);
    if (new URLSearchParams(search).has("reviewSession")) navigate("/parent/dashboard", { replace: true });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Welcome, {user?.firstName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage sessions for your children</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-primary rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="opacity-80" />
            <span className="text-xs font-medium opacity-80">Upcoming</span>
          </div>
          <p className="text-2xl font-bold">{summary.data?.scheduled ?? 0}</p>
          <p className="text-xs opacity-70 mt-0.5">sessions booked</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.data?.completed ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">sessions done</p>
        </div>
      </div>

      {/* Book session CTA */}
      <Link
        href="/parent/tutors"
        className="block mb-6 bg-gradient-to-r from-primary to-blue-500 rounded-xl p-5 text-white shadow-md hover:opacity-95 transition-opacity"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-base">Book a Session</p>
            <p className="text-xs opacity-80 mt-0.5">Browse available tutors and schedule a time</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <GraduationCap size={20} />
          </div>
        </div>
      </Link>

      {/* Booking requests */}
      {requests.length > 0 && (
        <div className="mb-6" data-testid="section-requests">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Requests awaiting a decision</h2>
            <span className="text-xs text-muted-foreground">Updates every 30 seconds</span>
          </div>
          <div className="space-y-2">
            {requests.map((session) => {
              const isCheckout = session.status === "pending_payment";
              const isTutorOffer = isCheckout && !!session.tutorConfirmedAt;
              const left = timeLeft(session.requestExpiresAt);
              return (
                <div key={session.id} className="bg-card border border-amber-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-1 duration-300" data-testid={`card-request-${session.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{session.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">with {session.tutorName} · {session.studentName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatInZone(session.scheduledAt)} · {session.durationMinutes}min · {lessonModeLabel(session.lessonMode)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={session.status} />
                      <span className="text-xs font-medium text-foreground">${session.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                      <Hourglass size={12} className="shrink-0 mt-0.5 text-amber-700" />
                      <span>
                        {isTutorOffer
                          ? <>Your tutor offered this time. Accept it to confirm the session and place a simulated hold. No real payment is taken. {session.requestExpiresAt && <>Offer expires {formatInZone(session.requestExpiresAt)}{left ? ` (${left})` : ""}.</>}</>
                          : isCheckout
                            ? <>Checkout not finished. No hold placed. {session.requestExpiresAt && <>Expires {formatInZone(session.requestExpiresAt)}{left ? ` (${left})` : ""}.</>} Cancel, then book again to retry.</>
                          : <>Waiting for {session.tutorName ?? "your tutor"} to accept. {session.requestExpiresAt && <>Expires {formatInZone(session.requestExpiresAt)}{left ? ` (${left})` : ""}.</>} Simulated hold only, no real card charged.</>}
                      </span>
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      {isTutorOffer && (
                        <button
                          type="button"
                          onClick={() => acceptTutorOffer(session)}
                          disabled={acceptTutorOfferMutation.isPending}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                          data-testid={`button-accept-offer-${session.id}`}
                        >
                          {acceptTutorOfferMutation.isPending ? "Accepting…" : "Accept offer"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => withdraw(session)}
                        disabled={cancellingId === session.id}
                        className="shrink-0 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-60 transition-colors"
                        data-testid={`button-withdraw-${session.id}`}
                      >
                        {cancellingId === session.id ? "Working..." : isTutorOffer ? "Decline" : isCheckout ? "Cancel" : "Withdraw"}
                      </button>
                    </div>
                  </div>
                  {actionError?.id === session.id && <p className="text-xs text-destructive mt-2" role="alert">{actionError.msg}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming sessions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Upcoming sessions</h2>
        </div>

        {sessions.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-6 text-center">
            <Calendar size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming sessions</p>
            <Link
              href="/parent/tutors"
              className="inline-block mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Browse Tutors
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((session) => (
              <div key={session.id} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{session.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">with {session.tutorName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatInZone(session.scheduledAt)} · {session.durationMinutes}min
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={session.status} />
                    <span className="text-xs font-medium text-foreground">${session.totalAmount.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent updates */}
      {recentUpdates.length > 0 && (
        <div className="mb-6" data-testid="section-updates">
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent updates</h2>
          <div className="space-y-2">
            {recentUpdates.map((session) => (
              <div key={session.id} className="bg-card border border-card-border rounded-xl p-4 flex items-start justify-between gap-3" data-testid={`card-update-${session.id}`}>
                <div className="flex items-start gap-2.5 min-w-0">
                  <XCircle size={15} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{session.subject} with {session.tutorName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatInZone(session.scheduledAt)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{session.cancellationReason ?? "Cancelled"}</p>
                  </div>
                </div>
                <Link href={`/parent/book/${session.tutorId}`} className="shrink-0 text-xs font-semibold text-brand-teal hover:underline" data-testid={`link-rebook-${session.id}`}>
                  Book again
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed sessions and reviews */}
      <div className="mb-6 scroll-mt-4" id="completed-sessions" ref={completedSectionRef} data-testid="section-completed-sessions">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Completed sessions</h2>
          {completed.length > 0 && <span className="text-xs text-muted-foreground">{completed.length} total</span>}
        </div>

        {deepLinkError && (
          <div className="flex items-start gap-2 p-3 mb-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert" data-testid="text-review-deeplink-error">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span className="flex-1">{deepLinkError}</span>
            <button type="button" onClick={() => { setDeepLinkError(""); navigate("/parent/dashboard", { replace: true }); }} className="text-xs font-semibold underline" data-testid="button-dismiss-deeplink-error">
              Dismiss
            </button>
          </div>
        )}

        {sessions.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : sessions.isError ? (
          <div className="bg-card border border-card-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">We could not load your sessions.</p>
            <button type="button" onClick={() => sessions.refetch()} className="mt-3 px-4 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors" data-testid="button-sessions-retry">
              Try again
            </button>
          </div>
        ) : completed.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-6 text-center">
            <Star size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Completed sessions will appear here. You can leave one review per tutor.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleCompleted.map((session) => (
              <div key={session.id} className="bg-card border border-card-border rounded-xl p-4 flex items-center justify-between gap-3" data-testid={`card-completed-session-${session.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{session.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">with {session.tutorName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatInZone(session.scheduledAt)}</p>
                </div>
                {reviewTargetIds.has(session.id) ? (
                  <TutorReviewButton session={session} onOpen={() => { setDeepLinkError(""); setReviewSessionId(session.id); }} />
                ) : (
                  <span className="shrink-0 text-[11px] text-muted-foreground" data-testid={`text-review-covered-${session.id}`}>One review per tutor</span>
                )}
              </div>
            ))}
            {completed.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllCompleted((v) => !v)}
                aria-expanded={showAllCompleted}
                className="w-full py-2 rounded-lg text-xs font-semibold text-brand-teal hover:bg-muted transition-colors"
                data-testid="button-toggle-completed"
              >
                {showAllCompleted ? "Show fewer" : `Show all ${completed.length} completed sessions`}
              </button>
            )}
          </div>
        )}
      </div>

      {reviewSession && <SessionReviewDialog session={reviewSession} onClose={closeReview} />}

      {/* Manage notifications CTA */}
      <Link
        href="/settings"
        className="flex items-center justify-between w-full p-4 rounded-xl bg-card border border-card-border hover:border-primary/40 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
            <Bell size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Manage Notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">Control booking and session email alerts</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
      </Link>
    </div>
  );
}
