import { useEffect, useState, useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useGetTutor, useGetTutorAvailability } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { GraduationCap, ShieldCheck, Star, BookOpen, Clock, ArrowLeft, MapPin, Award } from "lucide-react";
import { format, parseISO } from "date-fns";
import TestModeBanner from "@/components/TestModeBanner";

interface Review {
  id: number;
  authorId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
}

function InitialsAvatar({ first, last, size = "lg" }: { first: string; last: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-20 h-20 text-2xl",
  };
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary`}>
      {first[0]}{last[0]}
    </div>
  );
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}
        />
      ))}
    </div>
  );
}

export default function TutorProfile() {
  const [, params] = useRoute("/tutor/:id");
  const tutorId = Number(params?.id);
  const { user } = useAuth();

  const tutor = useGetTutor(tutorId);
  const availability = useGetTutorAvailability(tutorId);

  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!tutorId) return;
    fetch(`/api/tutors/${tutorId}/reviews`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]));
  }, [tutorId]);

  const availabilityWindows = useMemo(() => {
    if (!availability.data) return [];
    return [...availability.data].sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0));
  }, [availability.data]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const sessionCount = (tutor.data as { sessionCount?: number })?.sessionCount ?? 0;
  const verificationStatus = (tutor.data as { verificationStatus?: string })?.verificationStatus;
  const educationDetails = (tutor.data as { educationDetails?: string | null })?.educationDetails;
  const isVerified = verificationStatus === "approved";

  if (tutor.isLoading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tutor.data) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">Tutor not found</p>
          <Link href="/tutors" className="mt-2 text-sm text-primary hover:underline">Back to directory</Link>
        </div>
      </div>
    );
  }

  const t = tutor.data;
  const subjects = t.subjects ?? [];

  return (
    <>
      <TestModeBanner />
      <div className="min-h-screen bg-[#f9fafb]">

        {/* Hero */}
        <div className="bg-[#0f2240] px-5 pt-10 pb-8">
          <div className="max-w-2xl mx-auto">
            {/* Back */}
            <Link href="/tutors" className="inline-flex items-center gap-1.5 text-white/60 text-sm mb-6 hover:text-white transition-colors">
              <ArrowLeft size={14} /> Back to tutors
            </Link>

            <div className="flex items-start gap-4">
              <InitialsAvatar first={t.firstName} last={t.lastName} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-white">
                    {t.firstName} {t.lastName}
                  </h1>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                      <ShieldCheck size={11} /> Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {avgRating !== null ? (
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={Math.round(avgRating)} size={12} />
                      <span className="text-white/70 text-xs">{avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                    </div>
                  ) : (
                    <span className="text-white/50 text-xs">No reviews yet</span>
                  )}
                  {sessionCount > 0 && (
                    <span className="text-white/70 text-xs flex items-center gap-1">
                      <Award size={11} /> {sessionCount} session{sessionCount !== 1 ? "s" : ""} completed
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">${t.hourlyRate}</span>
                  <span className="text-white/60 text-sm">/hr</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* Bio */}
          {t.bio && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-2">About</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{t.bio}</p>
            </div>
          )}

          {/* Subjects */}
          {subjects.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={15} className="text-primary" />
                <h2 className="text-sm font-bold text-gray-900">Teaching subjects</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {subjects.map((sub) => (
                  <span key={sub} className="px-3 py-1 rounded-full bg-primary/8 text-primary text-xs font-semibold border border-primary/15">
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {educationDetails && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap size={15} className="text-primary" />
                <h2 className="text-sm font-bold text-gray-900">Education & Qualifications</h2>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{educationDetails}</p>
            </div>
          )}

          {/* Verification badge */}
          {isVerified && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-800">Background checked</p>
                  <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                    This tutor has a current Working With Children Check (WWCC) verified by Scholix.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Available slots */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} className="text-primary" />
              <h2 className="text-sm font-bold text-gray-900">Available time slots</h2>
            </div>
            {availability.isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : availabilityWindows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No availability set yet.</p>
            ) : (
              <div className="space-y-2">
                {availabilityWindows.map((w) => {
                  const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][w.dayOfWeek ?? 0];
                  return (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{dayLabel}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{w.startTime} – {w.endTime}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">Reviews</h2>
                {avgRating !== null && (
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={Math.round(avgRating)} size={13} />
                    <span className="text-sm font-bold text-gray-800">{avgRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <StarRating rating={review.rating} size={12} />
                      <span className="text-xs text-gray-400">
                        {(() => { try { return format(parseISO(review.createdAt), "MMM yyyy"); } catch { return ""; } })()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="pb-8">
            {user?.role === "parent" ? (
              <Link
                href={`/parent/book/${tutorId}`}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Book a session with {t.firstName}
              </Link>
            ) : !user ? (
              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Sign up to book
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center w-full py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors"
                >
                  Already have an account? Log in
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center">
                <p className="text-sm text-gray-500">Log in as a parent to book a session</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
