import { useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, Trash2, BookOpen, CreditCard, GraduationCap, XCircle, X } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import type { AppNotification } from "@/hooks/useNotifications";

const typeConfig: Record<string, { icon: any; iconBg: string; iconColor: string }> = {
  session_booked:    { icon: BookOpen,     iconBg: "bg-primary/10",     iconColor: "text-primary" },
  payment_confirmed: { icon: CreditCard,   iconBg: "bg-accent/10",      iconColor: "text-accent" },
  session_completed: { icon: GraduationCap, iconBg: "bg-green-100",     iconColor: "text-green-600" },
  session_cancelled: { icon: XCircle,      iconBg: "bg-destructive/10", iconColor: "text-destructive" },
};

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: {
  notification: AppNotification;
  onMarkRead: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const cfg = typeConfig[notification.type] ?? typeConfig["session_booked"];
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${
        !notification.isRead ? "bg-primary/5 border-l-2 border-l-primary" : ""
      }`}
    >
      <div className={`w-8 h-8 rounded-full ${cfg.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon size={14} className={cfg.iconColor} />
      </div>
      <div className="flex-1 min-w-0" onClick={() => !notification.isRead && onMarkRead(notification.id)}>
        <p className={`text-xs font-semibold leading-tight ${notification.isRead ? "text-foreground" : "text-foreground"}`}>
          {notification.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        {!notification.isRead && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Mark as read"
          >
            <Check size={12} className="text-muted-foreground" />
          </button>
        )}
        <button
          onClick={() => onDismiss(notification.id)}
          className="p-1 rounded hover:bg-muted transition-colors"
          title="Dismiss"
        >
          <Trash2 size={12} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

interface Props {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: number) => void;
  onClose: () => void;
}

export default function NotificationsPanel({
  notifications,
  unreadCount,
  isLoading,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 bg-card border border-card-border rounded-2xl shadow-2xl z-50 overflow-hidden"
      style={{ maxHeight: "calc(100vh - 120px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-foreground" />
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Mark all as read"
            >
              <CheckCheck size={12} />
              All read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Bell size={18} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-0.5">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={onMarkRead}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="border-t border-border px-4 py-2.5 text-center">
          <p className="text-[11px] text-muted-foreground">{notifications.length} notification{notifications.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}
