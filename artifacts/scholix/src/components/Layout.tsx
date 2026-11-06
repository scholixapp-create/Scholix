import { useState } from "react";
import { BrandMark } from "@/components/Brand";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { getListAdminUserRequestsQueryKey, useListAdminUserRequests, useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationsPanel from "@/components/NotificationsPanel";
import TestModeBanner from "@/components/TestModeBanner";
import ReportIssueModal from "@/components/ReportIssueModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BookOpen,
  LogOut,
  Clock,
  GraduationCap,
  Baby,
  DollarSign,
  Bell,
  Settings,
  BarChart2,
  Flag,
  UserCircle,
  Info,
  Sparkles,
  User,
  Receipt,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function getTutorNav(): NavItem[] {
  return [
    { href: "/tutor/dashboard", label: "Your Teaching Hub", icon: <LayoutDashboard size={18} /> },
    { href: "/tutor/sessions", label: "Sessions", icon: <Calendar size={18} /> },
    { href: "/tutor/earnings", label: "Your Growth", icon: <DollarSign size={18} /> },
    { href: "/tutor/students", label: "Students", icon: <Users size={18} /> },
    { href: "/tutor/availability", label: "Availability", icon: <Clock size={18} /> },
    { href: "/tutor/invoices", label: "Invoices", icon: <Receipt size={18} /> },
    { href: "/tutor/profile", label: "My Profile", icon: <User size={18} /> },
    { href: "/tutor/academy", label: "Scholix Academy", icon: <Sparkles size={18} /> },
  ];
}

function getParentNav(): NavItem[] {
  return [
    { href: "/parent/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/parent/students", label: "Students", icon: <Baby size={18} /> },
    { href: "/parent/tutors", label: "Find Tutors", icon: <GraduationCap size={18} /> },
    { href: "/parent/invoices", label: "Invoices", icon: <BookOpen size={18} /> },
  ];
}

function getStudentNav(): NavItem[] {
  return [
    { href: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/student/progress", label: "Progress", icon: <BarChart2 size={18} /> },
    { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];
}

function getAdminNav(): NavItem[] {
  return [
    { href: "/admin/dashboard", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { href: "/admin/users", label: "Users", icon: <Users size={18} /> },
    { href: "/admin/tutors", label: "Tutors", icon: <GraduationCap size={18} /> },
    { href: "/admin/sessions", label: "Sessions", icon: <Calendar size={18} /> },
    { href: "/admin/reports", label: "Reports", icon: <Flag size={18} /> },
    { href: "/admin/academy", label: "Academy CMS", icon: <Sparkles size={18} /> },
  ];
}

function getNav(role: string): NavItem[] {
  switch (role) {
    case "tutor": return getTutorNav();
    case "parent": return getParentNav();
    case "student": return getStudentNav();
    case "admin": return getAdminNav();
    default: return [];
  }
}

// Shared account destinations for the desktop sidebar footer and mobile account menu.
const ACCOUNT_LINKS: NavItem[] = [
  { href: "/profile/me", label: "Profile", icon: <UserCircle size={18} /> },
  { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
  { href: "/about", label: "About Scholix", icon: <Info size={18} /> },
];

function getRoleLabel(role: string) {
  switch (role) {
    case "tutor": return "Tutor";
    case "parent": return "Parent";
    case "student": return "Student";
    case "admin": return "Admin";
    default: return role;
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const isAdmin = user?.role === "admin";
  const adminRequests = useListAdminUserRequests({
    query: { enabled: isAdmin, refetchInterval: isAdmin ? 30_000 : false, refetchOnWindowFocus: isAdmin, queryKey: getListAdminUserRequestsQueryKey() },
  });
  const requestBadge = !isAdmin || adminRequests.isLoading
    ? null
    : adminRequests.isError || !adminRequests.data
      ? { text: "?", label: "Pending user requests unavailable" }
      : adminRequests.data.length > 0
        ? { text: adminRequests.data.length > 99 ? "99+" : String(adminRequests.data.length), label: `${adminRequests.data.length} pending user requests` }
        : null;
  const { notifications, unreadCount, isLoading: notifsLoading, markRead, markAllRead, dismiss } = useNotifications();

  if (!user) return <>{children}</>;

  const navItems = getNav(user.role);

  const handleLogout = () => {
    logoutMutation.mutate(undefined as void, {
      onSettled: () => {
        queryClient.clear();
        logout();
      },
    });
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
    <TestModeBanner />
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-background">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Scholix home">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand-cream"><BrandMark size={26} /></span>
            <span className="font-display font-semibold text-xl text-brand-cream tracking-tight">Scholix</span>
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-2 py-2 rounded-lg bg-sidebar-accent">
              <p className="text-[10px] text-brand-gold font-semibold uppercase tracking-[0.16em] mb-0.5">{getRoleLabel(user.role)}</p>
              <p className="text-sm font-semibold text-white truncate">{user.firstName} {user.lastName}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                data-notification-trigger
                aria-expanded={showNotifications}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={17} className="text-sidebar-foreground/70" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-white shadow-[inset_3px_0_0_#d4a850]"
                    : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.href === "/admin/users" && requestBadge && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand-gold text-sidebar text-[10px] font-bold flex items-center justify-center" title={requestBadge.label} data-testid="badge-pending-user-requests">
                    <span aria-hidden="true">{requestBadge.text}</span>
                    <span className="sr-only">{requestBadge.label}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border space-y-0.5">
          {ACCOUNT_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location === item.href
                  ? "bg-sidebar-primary text-white shadow-[inset_3px_0_0_#d4a850]"
                  : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent transition-colors"
          >
            <Flag size={18} />
            Report Issue
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-sidebar text-white border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2" aria-label="Scholix home">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-cream"><BrandMark size={22} /></span>
            <span className="font-display font-semibold text-lg tracking-tight">Scholix</span>
          </Link>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs text-white/60 mr-1 max-w-20 truncate">{user.firstName}</span>
            {/* Bell — mobile */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
                data-notification-trigger
                aria-expanded={showNotifications}
                aria-label="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
            <button
              onClick={() => setShowReportModal(true)}
              className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
              title="Report Issue"
              aria-label="Report Issue"
            >
              <Flag size={16} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                data-testid="button-account-menu"
                className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
              >
                <UserCircle size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-1rem)]">
                <DropdownMenuLabel className="truncate">
                  <span className="block text-[10px] uppercase tracking-[0.16em] text-brand-gold">{getRoleLabel(user.role)}</span>
                  {user.firstName} {user.lastName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ACCOUNT_LINKS.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-center gap-2" data-testid={`menu-account-${item.href.replace(/\W+/g, "-").replace(/^-|-$/g, "")}`}>
                      {item.icon}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className="flex items-center gap-2" data-testid="menu-account-sign-out">
                  <LogOut size={18} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Legal footer — desktop only */}
        <footer className="hidden lg:flex items-center justify-between px-6 py-3 border-t border-border bg-background/50 text-[11px] text-muted-foreground shrink-0">
          <span>© {new Date().getFullYear()} Scholix · Independent tutoring, organised</span>
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="/tutor-agreement" className="hover:text-foreground transition-colors">Tutor Agreement</a>
            <button
              onClick={() => setShowReportModal(true)}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Flag size={10} />
              Report Issue
            </button>
          </div>
        </footer>

        {/* Bottom nav — mobile */}
        <nav aria-label="Mobile navigation" className={`lg:hidden ${isAdmin ? "grid grid-cols-3" : "flex items-center overflow-x-auto overscroll-x-contain"} border-t border-border bg-card px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shrink-0`}>
          {navItems.map((item) => {
            const active = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative ${isAdmin ? "min-w-0" : "flex-1 min-w-20 shrink-0"} flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors ${
                  active ? "text-brand-teal" : "text-muted-foreground"
                }`}
              >
                {item.icon}
                {item.href === "/admin/users" && requestBadge && (
                  <span className="absolute top-0.5 left-1/2 ml-1.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-gold text-sidebar text-[9px] font-bold flex items-center justify-center" data-testid="badge-pending-user-requests-mobile">
                    <span aria-hidden="true">{requestBadge.text}</span>
                    <span className="sr-only">{requestBadge.label}</span>
                  </span>
                )}
                <span className="text-[10px] font-medium max-w-20 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>

    {showNotifications && (
      <NotificationsPanel
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={notifsLoading}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onDismiss={dismiss}
        onClose={() => setShowNotifications(false)}
      />
    )}

    {/* Report Issue Modal */}
    {showReportModal && <ReportIssueModal onClose={() => setShowReportModal(false)} />}
    </div>
  );
}
