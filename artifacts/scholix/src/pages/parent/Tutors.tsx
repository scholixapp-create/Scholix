import { useListTutors } from "@workspace/api-client-react";
import { Link } from "wouter";
import { GraduationCap, Star } from "lucide-react";

export default function ParentTutors() {
  const tutors = useListTutors();

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Find a Tutor</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Browse verified tutors and book a session</p>
      </div>

      {tutors.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : tutors.data?.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <GraduationCap size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No tutors available</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon as more tutors are approved</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tutors.data?.map((tutor) => (
            <div key={tutor.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <GraduationCap size={22} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{tutor.firstName} {tutor.lastName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={11} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-muted-foreground">Coming soon</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-bold text-foreground">${tutor.hourlyRate}</span>
                      <span className="text-xs text-muted-foreground">/hr</span>
                    </div>
                  </div>

                  {tutor.bio && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{tutor.bio}</p>
                  )}

                  {tutor.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tutor.subjects.map((sub) => (
                        <span key={sub} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <Link
                  href={`/parent/book/${tutor.id}`}
                  className="flex items-center justify-center py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Book Session
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
