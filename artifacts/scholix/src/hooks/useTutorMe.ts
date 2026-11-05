import { useQuery } from "@tanstack/react-query";

export interface TutorMe {
  id: number;
  userId: number;
  bio?: string | null;
  subjects?: string[];
  hourlyRate?: number | null;
  verificationStatus: string;
  isApproved?: boolean;
  wwccNumber?: string | null;
  wwccExpiry?: string | null;
  educationDetails?: string | null;
  abn?: string | null;
  documents?: { id: number; docType: string; originalName: string; uploadedAt?: string }[];
}

export const TUTOR_ME_QUERY_KEY = ["/api/tutors/me"] as const;

export async function fetchTutorMe(): Promise<TutorMe> {
  const res = await fetch("/api/tutors/me", {
    headers: { Authorization: `Bearer ${localStorage.getItem("scholix_token") ?? ""}` },
  });
  if (!res.ok) throw new Error(`Could not load tutor profile (${res.status})`);
  return res.json();
}

export function useTutorMe(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: TUTOR_ME_QUERY_KEY,
    queryFn: fetchTutorMe,
    refetchInterval: options?.refetchInterval,
  });
}

/** Canonical approved status is "verified"; "approved" is a legacy alias. */
export function isTutorVerified(status: string | undefined | null) {
  return status === "verified" || status === "approved";
}
