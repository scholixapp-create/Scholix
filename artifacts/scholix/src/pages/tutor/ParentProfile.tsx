import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useGetTutorParentProfile } from "@workspace/api-client-react";
import { ArrowLeft, CalendarDays, Download, Mail, Phone, Receipt, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

export default function TutorParentProfile() {
  const [matched, params] = useRoute("/tutor/parents/:parentId");
  const parentId = Number(params?.parentId);
  const validId = matched && Number.isSafeInteger(parentId) && parentId > 0;
  const profile = useGetTutorParentProfile(validId ? parentId : 0, {
    query: { enabled: Boolean(validId), refetchOnMount: "always" },
  });
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const downloadInvoice = async (invoiceId: number) => {
    setDownloadingId(invoiceId);
    setDownloadError(null);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Invoice download failed");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `scholix-invoice-${invoiceId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Could not download this invoice. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!validId) {
    return <div className="p-6 text-sm text-destructive">Invalid parent profile.</div>;
  }

  if (profile.isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4" aria-label="Loading parent profile">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-36 rounded-xl bg-muted animate-pulse" />
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Link href="/tutor/students" className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft size={14} /> Back to students
        </Link>
        <div className="rounded-xl border border-card-border bg-card p-6">
          <h1 className="text-lg font-semibold text-foreground">Parent profile unavailable</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This parent is not connected to your tutoring history, or the account is no longer active.
          </p>
        </div>
      </div>
    );
  }

  const { parent, students, invoices } = profile.data;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <Link href="/tutor/students" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <ArrowLeft size={13} /> Back to students
        </Link>
        <h1 className="text-xl font-bold text-foreground">Parent profile</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Family details, connected students and your invoice history.</p>
      </div>

      <section className="rounded-xl border border-card-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-foreground">{parent.firstName} {parent.lastName}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Scholix parent since {format(parseISO(parent.createdAt), "PPP")}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {parent.email && (
                <a href={`mailto:${parent.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <Mail size={14} /> {parent.email}
                </a>
              )}
              {parent.phone && (
                <a href={`tel:${parent.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <Phone size={14} /> {parent.phone}
                </a>
              )}
              {!parent.email && !parent.phone && <span className="text-sm text-muted-foreground">No contact details available.</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-card-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users size={15} className="text-primary" /> Connected students
          </h2>
          <span className="text-xs text-muted-foreground">{students.length}</span>
        </div>
        {students.length === 0 ? (
          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            No active student profiles are connected to your sessions with this family.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {students.map((student) => (
              <article key={student.id} className="py-3 first:pt-0 last:pb-0">
                <Link href={`/tutor/students?student=${student.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">
                  {student.firstName}{student.lastName ? ` ${student.lastName}` : ""}
                </Link>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {student.yearLevel && <span>{student.yearLevel}</span>}
                  {student.school && <span>{student.school}</span>}
                  {student.subjects && <span>{student.subjects}</span>}
                  {!student.hasLessonAddress && <span className="text-amber-700">Lesson address needed for in-person bookings</span>}
                </div>
                {student.goals && <p className="mt-1.5 text-xs text-muted-foreground">{student.goals}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-card-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Receipt size={15} className="text-primary" /> Invoice history
          </h2>
          <span className="text-xs text-muted-foreground">{invoices.length}</span>
        </div>
        {downloadError && <p role="alert" className="mb-3 text-xs text-destructive">{downloadError}</p>}
        {invoices.length === 0 ? (
          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">No invoices are recorded for your sessions with this family.</p>
        ) : (
          <div className="divide-y divide-border">
            {invoices.map((invoice) => (
              <article key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    <Link href={`/tutor/students?student=${invoice.studentId}`} className="hover:text-primary hover:underline">
                      {invoice.studentName}
                    </Link>
                    {" · "}{invoice.subject}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays size={12} /> {format(parseISO(invoice.scheduledAt), "PPP")}
                    {" · "}Invoice #{invoice.id}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Total ${invoice.totalAmount.toFixed(2)} · Fee ${invoice.platformCommission.toFixed(2)} · You earned ${invoice.tutorEarnings.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void downloadInvoice(invoice.id)}
                  disabled={downloadingId !== null}
                  aria-label={`Download invoice ${invoice.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary hover:text-primary disabled:opacity-60"
                >
                  <Download size={13} /> {downloadingId === invoice.id ? "Downloading…" : "PDF"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
