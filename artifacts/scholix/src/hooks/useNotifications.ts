import { useState, useEffect, useCallback, useRef } from "react";

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  isRead: boolean;
  createdAt: string;
}

const BASE = "/api";
const POLL_MS = 15_000;

function getToken(): string | null {
  return localStorage.getItem("scholix_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) { setIsLoading(false); return; }
    try {
      const res = await fetch(`${BASE}/notifications`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // silent — network error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    await fetch(`${BASE}/notifications/${id}/read`, {
      method: "PATCH",
      headers: authHeaders(),
    });
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch(`${BASE}/notifications/read-all`, {
      method: "PATCH",
      headers: authHeaders(),
    });
  }, []);

  const dismiss = useCallback(async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`${BASE}/notifications/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, unreadCount, isLoading, fetchNotifications, markRead, markAllRead, dismiss };
}
