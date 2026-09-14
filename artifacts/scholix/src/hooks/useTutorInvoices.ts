import { useQuery } from "@tanstack/react-query";

export interface TutorInvoiceSummary {
  id: number;
  sessionId: number;
  totalAmount: number;
  platformCommission: number;
  tutorEarnings: number;
  commissionRate: number;
  commissionTier: string | null;
  generatedAt: string;
  scheduledAt: string;
}

export function useTutorInvoices(tutorUserId?: number) {
  return useQuery<TutorInvoiceSummary[]>({
    queryKey: ["tutor-invoices", tutorUserId],
    enabled: !!tutorUserId,
    queryFn: async () => {
      const response = await fetch(`/api/invoices?tutorId=${tutorUserId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("scholix_token") ?? ""}`,
        },
      });
      if (!response.ok) throw new Error("Could not load tutor invoices");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });
}