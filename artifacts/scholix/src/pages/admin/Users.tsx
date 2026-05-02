import { useAdminListUsers } from "@workspace/api-client-react";
import { Users, GraduationCap, User, ShieldCheck } from "lucide-react";
import { format, parseISO } from "date-fns";

const roleConfig: Record<string, { label: string; cls: string; icon: any }> = {
  admin: { label: "Admin", cls: "bg-purple-100 text-purple-700", icon: ShieldCheck },
  tutor: { label: "Tutor", cls: "bg-blue-100 text-blue-700", icon: GraduationCap },
  parent: { label: "Parent", cls: "bg-green-100 text-green-700", icon: User },
  student: { label: "Student", cls: "bg-yellow-100 text-yellow-700", icon: User },
};

export default function AdminUsers() {
  const users = useAdminListUsers();

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">All Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{users.data?.length ?? 0} registered users</p>
      </div>

      {users.isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {users.data?.map((u) => {
            const cfg = roleConfig[u.role] ?? roleConfig.student;
            const Icon = cfg.icon;
            return (
              <div key={u.id} className="bg-card border border-card-border rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.cls}`}>{cfg.label}</span>
                  <span className="text-[10px] text-muted-foreground">{format(parseISO(u.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
