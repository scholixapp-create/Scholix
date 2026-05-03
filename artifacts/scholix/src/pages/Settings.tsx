import { useState, useEffect } from "react";
import { Bell, Mail, CheckCircle, Calendar, BookOpen, Settings as SettingsIcon } from "lucide-react";

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

const EVENT_DESCRIPTIONS = [
  {
    icon: BookOpen,
    title: "Booking confirmation",
    desc: "When a session is booked — sent to both tutor and parent.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Bell,
    title: "Session reminder",
    desc: "24 hours before a scheduled session starts.",
    color: "text-purple-600",
    bg: "bg-purple-100",
  },
  {
    icon: CheckCircle,
    title: "Session completed",
    desc: "When a tutor marks a session as complete, including invoice summary.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
];

export default function Settings() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setEnabled(data.emailNotificationsEnabled ?? true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ emailNotificationsEnabled: next }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account preferences</p>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-0.5">
            <Mail size={15} className="text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Email Notifications</h2>
          </div>
          <p className="text-xs text-muted-foreground">Control whether Scholix sends you email updates</p>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="h-10 rounded-lg bg-muted animate-pulse" />
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Email notifications
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {enabled ? "You'll receive emails for the events below" : "All email notifications are paused"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {saved && <span className="text-xs text-accent font-medium">Saved</span>}
                <button
                  onClick={() => handleToggle(!enabled)}
                  disabled={saving}
                  className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${
                    enabled ? "bg-primary" : "bg-muted-foreground/30"
                  } ${saving ? "opacity-60" : ""}`}
                  aria-label="Toggle email notifications"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      enabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`bg-card border border-card-border rounded-2xl overflow-hidden transition-opacity ${enabled ? "opacity-100" : "opacity-40"}`}>
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Events</p>
        </div>
        <div className="divide-y divide-border">
          {EVENT_DESCRIPTIONS.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="flex items-start gap-3 px-5 py-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={15} className={color} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <div className="ml-auto shrink-0 mt-0.5">
                {enabled ? (
                  <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">Active</span>
                ) : (
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Paused</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed">
        In-app notifications are always on regardless of this setting.<br />
        Email is currently delivered via console log (no real email provider configured).
      </p>
    </div>
  );
}
