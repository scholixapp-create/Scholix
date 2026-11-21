import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { AlertCircle, CheckCircle, MessageSquareText } from "lucide-react";
import {
  getListParentInformationRequestsQueryKey,
  useListParentInformationRequests,
  useRespondParentInformationRequest,
} from "@workspace/api-client-react";
import ParentIntakeCompletion from "./ParentIntakeCompletion";

function messageFromError(error: unknown) {
  const value = error as { data?: { error?: unknown }; message?: string };
  if (typeof value?.data?.error === "string") return value.data.error;
  return value?.message ?? "Could not submit your response. Please try again.";
}

export default function ParentInformationRequests({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const requests = useListParentInformationRequests({
    query: {
      queryKey: getListParentInformationRequestsQueryKey(),
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  });
  const respond = useRespondParentInformationRequest();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  const submit = (requestId: number) => {
    const responseText = drafts[requestId]?.trim() ?? "";
    if (!responseText) {
      setErrors((previous) => ({ ...previous, [requestId]: "Write a response before submitting." }));
      return;
    }
    setErrors((previous) => ({ ...previous, [requestId]: "" }));
    respond.mutate(
      { requestId, data: { responseText } },
      {
        onSuccess: async () => {
          setDrafts((previous) => ({ ...previous, [requestId]: "" }));
          await queryClient.invalidateQueries({ queryKey: getListParentInformationRequestsQueryKey() });
        },
        onError: (error) => setErrors((previous) => ({ ...previous, [requestId]: messageFromError(error) })),
      },
    );
  };

  return (
    <>
    <ParentIntakeCompletion compact={compact} />
    <section
      className={`rounded-xl border border-card-border bg-card ${compact ? "p-4" : "p-5"}`}
      aria-labelledby="parent-information-requests-heading"
      data-testid="section-parent-information-requests"
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageSquareText size={17} className="text-primary" />
        <h2 id="parent-information-requests-heading" className="text-sm font-semibold text-foreground">
          Information requests
        </h2>
      </div>

      {requests.isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">Loading requests…</p>
      ) : requests.isError ? (
        <div className="flex items-center justify-between gap-2 text-sm text-destructive" role="alert">
          <span>Requests could not be loaded.</span>
          <button type="button" onClick={() => requests.refetch()} className="font-semibold underline" data-testid="button-retry-information-requests">
            Retry
          </button>
        </div>
      ) : !requests.data?.length ? (
        <p className="text-sm text-muted-foreground">There are no open or previous requests.</p>
      ) : (
        <div className="space-y-3">
          {requests.data.map((request) => (
            <article key={request.id} className="rounded-lg border border-border p-3" data-testid={`card-information-request-${request.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Requested {format(parseISO(request.requestedAt), "MMM d, yyyy")}
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  request.status === "pending" ? "bg-amber-100 text-amber-800" :
                  request.status === "responded" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"
                }`} data-testid={`status-information-request-${request.id}`}>
                  {request.status === "pending" ? "Reply needed" : request.status === "responded" ? "Reply sent" : "Closed"}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{request.requestText}</p>
              {request.status === "pending" ? (
                <div className="mt-3 space-y-2">
                  <label className="sr-only" htmlFor={`response-${request.id}`}>Your response</label>
                  <textarea
                    id={`response-${request.id}`}
                    value={drafts[request.id] ?? ""}
                    onChange={(event) => setDrafts((previous) => ({ ...previous, [request.id]: event.target.value }))}
                    maxLength={4000}
                    rows={3}
                    placeholder="Type your response"
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid={`input-information-response-${request.id}`}
                  />
                  {errors[request.id] && <p className="text-xs text-destructive" role="alert">{errors[request.id]}</p>}
                  <button
                    type="button"
                    onClick={() => submit(request.id)}
                    disabled={respond.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    data-testid={`button-send-information-response-${request.id}`}
                  >
                    <CheckCircle size={13} /> {respond.isPending ? "Sending…" : "Send response"}
                  </button>
                </div>
              ) : request.responseText ? (
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-2.5 text-sm text-muted-foreground">
                  Your response: {request.responseText}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
      {respond.isError && !Object.values(errors).some(Boolean) && (
        <p className="mt-2 flex items-center gap-1 text-xs text-destructive" role="alert">
          <AlertCircle size={13} /> {messageFromError(respond.error)}
        </p>
      )}
    </section>
    </>
  );
}
