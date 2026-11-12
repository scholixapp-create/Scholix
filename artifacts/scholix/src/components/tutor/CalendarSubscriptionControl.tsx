import { useState } from "react";
import {
  getGetTutorCalendarFeedQueryKey,
  useDisableTutorCalendarFeed,
  useEnableTutorCalendarFeed,
  useGetTutorCalendarFeed,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarSync, Copy, ExternalLink, RefreshCw, Unplug } from "lucide-react";

export default function CalendarSubscriptionControl({ tutorId }: { tutorId: number }) {
  const queryClient = useQueryClient();
  const feedQuery = useGetTutorCalendarFeed(tutorId, {
    query: {
      enabled: Number.isSafeInteger(tutorId) && tutorId > 0,
      queryKey: getGetTutorCalendarFeedQueryKey(tutorId),
      refetchOnMount: "always",
      retry: false,
    },
  });
  const [message, setMessage] = useState("");
  const enableFeed = useEnableTutorCalendarFeed({
    mutation: {
      onSuccess: async () => {
        setMessage("Your new calendar link is ready. Replace any older subscription with this link.");
        await queryClient.invalidateQueries({ queryKey: getGetTutorCalendarFeedQueryKey(tutorId) });
      },
      onError: () => setMessage("Could not create the calendar link. Please try again."),
    },
  });
  const disableFeed = useDisableTutorCalendarFeed({
    mutation: {
      onSuccess: async () => {
        setMessage("Calendar subscription disconnected. The previous link no longer works.");
        await queryClient.invalidateQueries({ queryKey: getGetTutorCalendarFeedQueryKey(tutorId) });
      },
      onError: () => setMessage("Could not disconnect the calendar. Please try again."),
    },
  });

  const configuredApiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
  const feedUrl = feedQuery.data?.feedUrl
    ? new URL(feedQuery.data.feedUrl, configuredApiUrl || window.location.origin).toString()
    : null;
  const busy = enableFeed.isPending || disableFeed.isPending;

  async function copyFeedUrl() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setMessage("Calendar link copied.");
    } catch {
      setMessage("Select and copy the link from the field.");
    }
  }

  function rotateLink() {
    if (window.confirm("This revokes the old calendar link. You will need to replace it in any connected calendar apps. Continue?")) {
      enableFeed.mutate({ tutorId });
    }
  }

  function revokeLink() {
    if (window.confirm("Disconnect this calendar? Its current subscription link will stop working.")) {
      disableFeed.mutate({ tutorId });
    }
  }

  return (
    <div className="border-b border-border bg-muted/20 px-4 py-4 sm:px-5" data-testid="section-calendar-subscription">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <CalendarSync size={15} className="text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Connect Google or Apple Calendar</h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Subscribe to upcoming Scholix lessons and unavailable dates. Weekly availability stays in Scholix.
            Student names, subjects, and addresses are not included.
          </p>
        </div>
        {feedQuery.isLoading ? (
          <span className="text-xs text-muted-foreground" role="status">Checking calendar link…</span>
        ) : feedQuery.isError ? (
          <button
            type="button"
            onClick={() => void feedQuery.refetch()}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-background"
            data-testid="button-calendar-feed-retry"
          >
            <RefreshCw size={13} /> Retry
          </button>
        ) : feedQuery.data?.enabled && feedUrl ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={copyFeedUrl}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              data-testid="button-calendar-feed-copy"
            >
              <Copy size={13} /> Copy calendar link
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={rotateLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50"
              data-testid="button-calendar-feed-regenerate"
            >
              <RefreshCw size={13} /> Regenerate
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={revokeLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-background disabled:opacity-50"
              data-testid="button-calendar-feed-disconnect"
            >
              <Unplug size={13} /> Disconnect
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => enableFeed.mutate({ tutorId })}
            className="inline-flex items-center gap-1.5 self-start rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            data-testid="button-calendar-feed-enable"
          >
            <CalendarSync size={13} /> Create calendar link
          </button>
        )}
      </div>

      {feedQuery.data?.enabled && feedUrl && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            readOnly
            value={feedUrl}
            aria-label="Private Scholix calendar subscription link"
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11px] text-muted-foreground"
            data-testid="input-calendar-feed-url"
          />
          <details className="self-start text-xs text-muted-foreground sm:self-center">
            <summary className="inline-flex cursor-pointer items-center gap-1 font-semibold text-primary">
              <ExternalLink size={12} /> Setup instructions
            </summary>
            <div className="mt-2 max-w-xl rounded-lg border border-border bg-background p-3 leading-relaxed">
              <p><strong>Google Calendar:</strong> open Settings, choose Add calendar, then From URL. Paste the copied link.</p>
              <p className="mt-2"><strong>Apple Calendar:</strong> choose File, New Calendar Subscription, then paste the link.</p>
              <p className="mt-2">Calendar apps refresh subscriptions periodically, so changes may not appear immediately. Treat this link like a password. Regenerate it to revoke the old link.</p>
            </div>
          </details>
        </div>
      )}

      {message && <p role="status" className="mt-2 text-xs text-muted-foreground" data-testid="text-calendar-feed-message">{message}</p>}
      {feedQuery.isError && <p role="alert" className="mt-2 text-xs text-destructive">Could not load calendar connection settings.</p>}
    </div>
  );
}
