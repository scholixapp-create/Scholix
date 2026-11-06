import { useEffect, useState } from "react";
import {
  getAdminListUsersQueryKey,
  getGetAdminUserQueryKey,
  getListAdminUserRequestsQueryKey,
  getListDeletionRequestsQueryKey,
  useAdminListUsers,
  useApproveParent,
  useDeleteAdminUser,
  useGetAdminUser,
  useUpdateAdminUserStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { AlertCircle, GraduationCap, Search, ShieldCheck, User, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import UserRequestsQueue from "@/components/admin/UserRequestsQueue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const roleConfig: Record<string, { label: string; cls: string; icon: any }> = {
  admin: { label: "Admin", cls: "bg-purple-100 text-purple-700", icon: ShieldCheck },
  tutor: { label: "Tutor", cls: "bg-blue-100 text-blue-700", icon: GraduationCap },
  parent: { label: "Parent", cls: "bg-green-100 text-green-700", icon: User },
  student: { label: "Student", cls: "bg-yellow-100 text-yellow-700", icon: User },
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIsActive, setConfirmIsActive] = useState<boolean | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const users = useAdminListUsers({ search: debouncedSearch }, {
    query: { refetchInterval: 30_000, refetchOnMount: "always", refetchOnWindowFocus: true, queryKey: getAdminListUsersQueryKey({ search: debouncedSearch }) },
  });
  const detail = useGetAdminUser(selectedUserId ?? 0, {
    query: { enabled: selectedUserId !== null, refetchInterval: 30_000, refetchOnMount: "always", queryKey: getGetAdminUserQueryKey(selectedUserId ?? 0) },
  });
  const invalidateRequests = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getListAdminUserRequestsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListDeletionRequestsQueryKey() }),
  ]);
  const statusMutation = useUpdateAdminUserStatus({
    mutation: {
      onSuccess: async (updatedUser) => {
        setStatusError("");
        setConfirmOpen(false);
        setConfirmIsActive(null);
        setSelectedUserId(null);
        queryClient.setQueryData(getGetAdminUserQueryKey(updatedUser.id), updatedUser.isActive ? { ...updatedUser, reapplicationRequestedAt: null } : updatedUser);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
          invalidateRequests(),
          queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(updatedUser.id) }),
        ]);
      },
      onError: (error) => {
        const apiError = error as { data?: { error?: unknown }; message?: string };
        setStatusError(
          typeof apiError.data?.error === "string"
            ? apiError.data.error
            : apiError.message ?? "Could not update this account. Please try again.",
        );
      },
    },
  });

  const [approveError, setApproveError] = useState("");
  const [approveSuccess, setApproveSuccess] = useState("");
  const approveMutation = useApproveParent({
    mutation: {
      onSuccess: async (updatedUser) => {
        setApproveError("");
        setApproveSuccess("Parent account approved.");
        queryClient.setQueryData(getGetAdminUserQueryKey(updatedUser.id), updatedUser);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
          invalidateRequests(),
          queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(updatedUser.id) }),
        ]);
      },
      onError: (error) => {
        const apiError = error as { data?: { error?: unknown } };
        setApproveSuccess("");
        setApproveError(
          typeof apiError.data?.error === "string" ? apiError.data.error : "Could not approve this parent. Please try again.",
        );
      },
    },
  });

  const deleteMutation = useDeleteAdminUser({
    mutation: {
      onSuccess: async () => {
        setDeleteError("");
        setDeleteConfirmOpen(false);
        setSelectedUserId(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
          invalidateRequests(),
          queryClient.invalidateQueries({
            queryKey: getGetAdminUserQueryKey(selectedUserId ?? 0),
          }),
        ]);
      },
      onError: (error) => {
        const apiError = error as { data?: { error?: unknown }; message?: string };
        setDeleteError(
          typeof apiError.data?.error === "string"
            ? apiError.data.error
            : apiError.message ?? "Could not delete this account. Please try again.",
        );
      },
    },
  });

  const selectedUser = detail.data;
  const isSelf = selectedUser?.id === currentUser?.id;
  const pendingReapply = !!selectedUser && !selectedUser.isActive && !!selectedUser.reapplicationRequestedAt;
  const role = selectedUser ? roleConfig[selectedUser.role] ?? roleConfig.student : null;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">User management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Search accounts and manage their active status.
        </p>
      </div>

      <UserRequestsQueue
        onSelectUser={(userId) => {
          setStatusError("");
          setApproveError("");
          setApproveSuccess("");
          setSelectedUserId(userId);
        }}
        onReviewed={(userId) => queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(userId) })}
      />

      <label className="relative block mb-4">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <span className="sr-only">Search users by name or email</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email"
          maxLength={120}
          className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Users size={16} />
        {users.data?.length ?? 0} matching users
      </div>

      {users.isLoading ? (
        <div className="space-y-2" aria-label="Loading users">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : users.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Users could not be loaded. Refresh the page and try again.
        </p>
      ) : users.data?.length ? (
        <div className="space-y-2">
          {users.data.map((listedUser) => {
            const cfg = roleConfig[listedUser.role] ?? roleConfig.student;
            const Icon = cfg.icon;
            return (
              <button
                type="button"
                key={listedUser.id}
                onClick={() => {
                  setStatusError("");
                  setSelectedUserId(listedUser.id);
                }}
                className="w-full bg-card border border-card-border rounded-xl p-3.5 flex items-center gap-3 text-left hover:border-primary/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {listedUser.firstName} {listedUser.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{listedUser.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.cls}`}>{cfg.label}</span>
                  <span className={`text-[10px] font-medium ${listedUser.isActive ? "text-emerald-700" : "text-destructive"}`}>
                    {listedUser.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(listedUser.createdAt), "MMM d, yyyy")}
                  </span>
                  {listedUser.verificationStatus && (
                    <span className="text-[10px] text-muted-foreground">
                      Verification: {listedUser.verificationStatus}
                      {listedUser.tutorApproved === null ? "" : listedUser.tutorApproved ? " · approved" : " · not approved"}
                    </span>
                  )}
                  {listedUser.archivedAt && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold" data-testid={`status-archived-${listedUser.id}`}>
                      Archived, restricted
                    </span>
                  )}
                  {listedUser.deletionRequestedAt && !listedUser.archivedAt && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-semibold" data-testid={`status-deletion-requested-${listedUser.id}`}>
                      Removal requested
                    </span>
                  )}
                  {listedUser.reapplicationRequestedAt && !listedUser.isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold ring-1 ring-amber-300" data-testid={`status-reapplication-${listedUser.id}`}>
                      Reapplication pending, reapplied {format(parseISO(listedUser.reapplicationRequestedAt), "MMM d, yyyy")}
                    </span>
                  )}
                  {listedUser.role === "parent" && listedUser.parentApproved === false && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold" data-testid={`status-parent-pending-${listedUser.id}`}>
                      Pending approval
                    </span>
                  )}
                  {listedUser.studentIdentityVerified !== null && (
                    <span className="text-[10px] text-muted-foreground">
                      Identity: {listedUser.studentIdentityVerified ? "verified" : "not verified"}
                    </span>
                  )}
                </div>
                <span className="sr-only">View account details</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-card-border bg-card p-8 text-center text-sm text-muted-foreground">
          No users match that search.
        </div>
      )}

      <Dialog
        open={selectedUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null);
            setConfirmOpen(false);
            setConfirmIsActive(null);
            setDeleteConfirmOpen(false);
            setStatusError("");
            setDeleteError("");
            setApproveError("");
            setApproveSuccess("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription>Account information and current verification status.</DialogDescription>
          </DialogHeader>

          {detail.isLoading ? (
            <div className="h-24 rounded-lg bg-muted animate-pulse" aria-label="Loading user details" />
          ) : detail.isError || !selectedUser || !role ? (
            <p className="text-sm text-destructive">User details could not be loaded.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-card-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground break-all">{selectedUser.email}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${role.cls}`}>
                    {role.label}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="text-right">{format(parseISO(selectedUser.createdAt), "MMM d, yyyy")}</dd>
                  <dt className="text-muted-foreground">Account status</dt>
                  <dd className={`text-right font-medium ${selectedUser.isActive ? "text-emerald-700" : "text-destructive"}`}>
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </dd>
                  {selectedUser.archivedAt && (
                    <>
                      <dt className="text-muted-foreground">Archived</dt>
                      <dd className="text-right font-medium text-muted-foreground" data-testid="text-archived-date">
                        Restricted since {format(parseISO(selectedUser.archivedAt), "MMM d, yyyy")}
                      </dd>
                    </>
                  )}
                  {selectedUser.deletionRequestedAt && !selectedUser.archivedAt && (
                    <>
                      <dt className="text-muted-foreground">Removal request</dt>
                      <dd className="text-right font-medium text-red-700" data-testid="text-deletion-requested-date">
                        Pending since {format(parseISO(selectedUser.deletionRequestedAt), "MMM d, yyyy")}
                      </dd>
                    </>
                  )}
                  {pendingReapply && selectedUser.reapplicationRequestedAt && (
                    <>
                      <dt className="text-muted-foreground">Reapplication</dt>
                      <dd className="text-right font-medium text-amber-700" data-testid="text-reapplication-date">
                        Requested {format(parseISO(selectedUser.reapplicationRequestedAt), "MMM d, yyyy, h:mm a")}
                      </dd>
                    </>
                  )}
                  {selectedUser.role === "tutor" && (
                    <>
                      <dt className="text-muted-foreground">Tutor verification</dt>
                      <dd className="text-right">{selectedUser.verificationStatus ?? "Not submitted"}</dd>
                      <dt className="text-muted-foreground">Tutor approval</dt>
                      <dd className="text-right">
                        {selectedUser.tutorApproved === null ? "Not available" : selectedUser.tutorApproved ? "Approved" : "Not approved"}
                      </dd>
                    </>
                  )}
                  {selectedUser.role === "parent" && (
                    <>
                      <dt className="text-muted-foreground">Parent approval</dt>
                      <dd className={`text-right font-medium ${selectedUser.parentApproved === false ? "text-amber-700" : "text-emerald-700"}`} data-testid="text-parent-approval">
                        {selectedUser.parentApproved === false ? "Pending approval" : "Approved"}
                      </dd>
                    </>
                  )}
                  {selectedUser.studentIdentityVerified !== null && (
                    <>
                      <dt className="text-muted-foreground">Student identity</dt>
                      <dd className="text-right">{selectedUser.studentIdentityVerified ? "Verified" : "Not verified"}</dd>
                    </>
                  )}
                </dl>
              </div>

              {pendingReapply && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="text-reapplication-explainer">
                  This user verified their email and is awaiting reactivation. Approving reactivates the account, applies the password they chose when reapplying, and keeps their existing role, details and history.
                </div>
              )}
              {selectedUser.role === "parent" && selectedUser.parentApproved === false && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-sm text-amber-900">This parent cannot book or use protected features until approved.</p>
                  <button
                    type="button"
                    onClick={() => { setApproveError(""); setApproveSuccess(""); approveMutation.mutate({ userId: selectedUser.id }); }}
                    disabled={approveMutation.isPending || !selectedUser.isActive}
                    className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    data-testid="button-approve-parent"
                  >
                    {approveMutation.isPending ? "Approving..." : "Approve parent account"}
                  </button>
                  {!selectedUser.isActive && <p className="text-xs text-amber-800">Reactivate the account before approving.</p>}
                </div>
              )}
              {approveError && (
                <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
                  <AlertCircle size={15} /> {approveError}
                </p>
              )}
              {approveSuccess && <p className="text-sm text-emerald-700" role="status">{approveSuccess}</p>}
              {selectedUser.deletionRequestedAt && !selectedUser.archivedAt && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  This user has a pending removal request. Review it in the user requests queue at the top of this page. The request alone does not change access.
                </p>
              )}
              {isSelf ? (
                <p className="text-sm text-muted-foreground">You cannot change or delete your own account.</p>
              ) : selectedUser.archivedAt ? (
                <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground" data-testid="text-archived-explainer">
                  This account was archived after an approved removal request. Its lesson, payment and compliance history is kept in restricted form, so reactivation and permanent deletion are not available.
                </p>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusError("");
                      setConfirmIsActive(!selectedUser.isActive);
                      setConfirmOpen(true);
                    }}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                      selectedUser.isActive
                        ? "border border-destructive/40 text-destructive hover:bg-destructive/5"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                    disabled={statusMutation.isPending || deleteMutation.isPending}
                  >
                    {selectedUser.isActive ? "Deactivate account" : pendingReapply ? "Approve reapplication" : "Reactivate account manually"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError("");
                      setDeleteConfirmOpen(true);
                    }}
                    className="w-full rounded-lg border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
                    disabled={statusMutation.isPending || deleteMutation.isPending}
                  >
                    Permanently delete test account
                  </button>
                </div>
              )}
              {statusError && (
                <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
                  <AlertCircle size={15} /> {statusError}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => {
        setConfirmOpen(open);
        if (!open) setConfirmIsActive(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmIsActive === false ? "Deactivate this account?" : pendingReapply ? "Approve reapplication?" : "Reactivate this account manually?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirm the account by email and role:
              <span className="mt-2 block font-semibold text-foreground break-all">
                {selectedUser?.email} · {role?.label}
              </span>
              {confirmIsActive === false
                ? " Deactivation immediately blocks sign-in and protected access."
                : pendingReapply
                  ? " The account will be reactivated with its original role and history, and the password submitted with the reapplication will take effect."
                  : " The user will be able to sign in again with their existing password."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedUser || statusMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!selectedUser || confirmIsActive === null) return;
                statusMutation.mutate({
                  userId: selectedUser.id,
                  data: { isActive: confirmIsActive },
                });
              }}
              className={selectedUser?.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {statusMutation.isPending ? "Saving..." : selectedUser?.isActive ? "Confirm" : pendingReapply ? "Approve reapplication" : "Reactivate account manually"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Confirm the account by email and role:
              <span className="mt-2 block font-semibold text-foreground break-all">
                {selectedUser?.email} · {role?.label}
              </span>
              <span className="mt-2 block">
                Deletion is allowed only when no durable booking, lesson, payment, review, or compliance history would be affected. Signup agreement evidence and the admin audit entry are retained.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
              <AlertCircle size={15} className="mt-0.5 shrink-0" /> {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedUser || deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!selectedUser) return;
                deleteMutation.mutate({ userId: selectedUser.id });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
