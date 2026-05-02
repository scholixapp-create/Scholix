import { useAdminListUsers, useListTutors, useApproveTutor } from "@workspace/api-client-react";
import { getListTutorsQueryKey, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, CheckCircle, XCircle } from "lucide-react";

export default function AdminTutorApprovals() {
  const qc = useQueryClient();
  const tutors = useListTutors();
  const allUsers = useAdminListUsers();
  const approveMutation = useApproveTutor();

  const allTutors = allUsers.data
    ?.filter((u) => u.role === "tutor")
    .map((u) => {
      const tutorProfile = tutors.data?.find((t) => t.userId === u.id);
      return { user: u, profile: tutorProfile };
    }) ?? [];

  const handleToggle = (tutorId: number, currentlyApproved: boolean) => {
    approveMutation.mutate(
      { tutorId, data: { approved: !currentlyApproved as boolean } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTutorsQueryKey() });
          qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        },
      }
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Tutor Approvals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {tutors.data?.filter((t) => t.isApproved).length ?? 0} of {allTutors.length} tutors approved
        </p>
      </div>

      {tutors.isLoading || allUsers.isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : allTutors.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <GraduationCap size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tutors registered yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allTutors.map(({ user: u, profile }) => (
            <div key={u.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <GraduationCap size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  {profile && (
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground">${profile.hourlyRate}/hr</span>
                      {profile.subjects.length > 0 && (
                        <span className="text-xs text-muted-foreground">{profile.subjects.join(", ")}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {profile ? (
                    <button
                      onClick={() => handleToggle(profile.id, profile.isApproved)}
                      disabled={approveMutation.isPending}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        profile.isApproved
                          ? "bg-accent/10 text-accent hover:bg-destructive/10 hover:text-destructive"
                          : "bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent"
                      }`}
                    >
                      {profile.isApproved ? (
                        <><CheckCircle size={13} /> Approved</>
                      ) : (
                        <><XCircle size={13} /> Pending</>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">No profile</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
