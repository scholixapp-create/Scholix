import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationsPanel from "@/components/NotificationsPanel";
import TestModeBanner from "@/components/TestModeBanner";
import ReportIssueModal from "@/components/ReportIssueModal";
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
    <div className="flex flex-col h-screen overflow-hidden">
    <TestModeBanner />
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-background">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">Scholix</span>
          </div>
        </div>

        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-2 py-2 rounded-lg bg-sidebar-accent">
              <p className="text-xs text-sidebar-foreground/60 font-medium uppercase tracking-wider mb-0.5">{getRoleLabel(user.role)}</p>
              <p className="text-sm font-semibold text-white truncate">{user.firstName} {user.lastName}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                title="Notifications"
              >
                <Bell size={17} className="text-sidebar-foreground/70" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
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
                    ? "bg-primary text-white"
                    : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border space-y-0.5">
          <Link
            href="/profile/me"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location === "/profile/me"
                ? "bg-primary text-white"
                : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
            }`}
          >
            <UserCircle size={18} />
            Profile
          </Link>
          <Link
            href="/settings"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location === "/settings"
                ? "bg-primary text-white"
                : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
            }`}
          >
            <Settings size={18} />
            Settings
          </Link>
          <Link
            href="/about"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent transition-colors"
          >
            <Info size={18} />
            About Scholix
          </Link>
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
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-sidebar text-white border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">Scholix</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/60 mr-1">{user.firstName}</span>
            {/* Bell — mobile */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
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
            </div>
            <button
              onClick={() => setShowReportModal(true)}
              className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
              title="Report Issue"
            >
              <Flag size={16} />
            </button>
            <button onClick={handleLogout} className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Legal footer — desktop only */}
        <footer className="hidden lg:flex items-center justify-between px-6 py-3 border-t border-border bg-background/50 text-[11px] text-muted-foreground shrink-0">
          <span>© {new Date().getFullYear()} Scholix Pty Ltd · ABN 00 000 000 000</span>
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
        <nav className="lg:hidden flex items-center border-t border-border bg-card px-2 py-1 shrink-0">
          {navItems.map((item) => {
            const active = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>

    {/* Report Issue Modal */}
    {showReportModal && <ReportIssueModal onClose={() => setShowReportModal(false)} />}
    </div>
  );
}
