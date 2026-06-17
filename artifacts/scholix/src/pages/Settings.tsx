import { useState, useEffect } from "react";
import { Bell, Mail, CheckCircle, Calendar, BookOpen, Settings as SettingsIcon, Lock, Trash2, Eye, EyeOff, AlertCircle, KeyRound } from "lucide-react";

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

function NotificationsTab() {
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
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
    <div className="space-y-4">
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
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
                <p className="text-sm font-medium text-foreground">Email notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {enabled ? "You'll receive emails for the events below" : "All email notifications are paused"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {saved && <span className="text-xs text-accent font-medium">Saved</span>}
                <button
                  onClick={() => handleToggle(!enabled)}
                  disabled={saving}
                  className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${enabled ? "bg-primary" : "bg-muted-foreground/30"} ${saving ? "opacity-60" : ""}`}
                  aria-label="Toggle email notifications"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-6" : "translate-x-0"}`} />
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

      <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
        In-app notifications are always on regardless of this setting.
      </p>
    </div>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deletionError, setDeletionError] = useState("");
  const [deletionSent, setDeletionSent] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 6) { setPasswordError("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords don't match."); return; }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError((data as { error?: string }).error ?? "Failed to update password.");
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch {
      setPasswordError("Unable to reach the server. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestDeletion = async () => {
    setDeletionError("");
    setRequestingDeletion(true);
    try {
      const res = await fetch("/api/auth/request-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ reason: deletionReason || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeletionError((data as { error?: string }).error ?? "Request failed. Please try again.");
        return;
      }
      setDeletionSent(true);
    } catch {
      setDeletionError("Unable to reach the server. Please try again.");
    } finally {
      setRequestingDeletion(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Change password */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-0.5">
            <KeyRound size={15} className="text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
          </div>
          <p className="text-xs text-muted-foreground">Update your account password</p>
        </div>
        <div className="px-5 py-5">
          {passwordError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
              <AlertCircle size={14} className="shrink-0" />
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 text-accent text-sm mb-4">
              <CheckCircle size={14} />
              Password updated successfully.
            </div>
          )}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Current password</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Your current password"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Confirm new password</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {changingPassword ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>

      {/* Account deletion */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-0.5">
            <Trash2 size={15} className="text-destructive" />
            <h2 className="text-sm font-semibold text-foreground">Delete Account</h2>
          </div>
          <p className="text-xs text-muted-foreground">Request permanent deletion of your account and data</p>
        </div>
        <div className="px-5 py-5">
          <div className="bg-destructive/5 border border-destructive/15 rounded-xl p-4 mb-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">This is a permanent action.</strong> Financial records (invoices, payments) are retained for 7 years as required by Australian law. Your account will be reviewed and deleted by our team within 2 business days.
            </p>
          </div>
          <button
            onClick={() => setShowDeletionModal(true)}
            className="w-full py-2.5 rounded-xl border border-destructive/40 text-destructive text-sm font-semibold hover:bg-destructive/5 transition-colors"
          >
            Request account deletion
          </button>
        </div>
      </div>

      {/* Deletion modal */}
      {showDeletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => !deletionSent && setShowDeletionModal(false)}>
          <div className="w-full max-w-sm bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Trash2 size={15} className="text-destructive" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Request account deletion</h3>
              </div>
            </div>
            <div className="px-5 py-5">
              {deletionSent ? (
                <div className="text-center py-2">
                  <CheckCircle size={32} className="text-accent mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground mb-1">Request submitted</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                    You'll receive a confirmation email. Our team will process your request within 2 business days.
                  </p>
                  <button onClick={() => setShowDeletionModal(false)} className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {deletionError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
                      <AlertCircle size={14} />
                      {deletionError}
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Reason <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      rows={3}
                      placeholder="Help us improve by sharing why you're leaving (optional)"
                      className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeletionModal(false)}
                      className="flex-1 py-2.5 rounded-lg border border-input text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRequestDeletion}
                      disabled={requestingDeletion}
                      className="flex-1 py-2.5 rounded-lg bg-destructive text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                    >
                      {requestingDeletion ? "Submitting…" : "Submit request"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"notifications" | "security">("notifications");

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

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl mb-5">
        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "notifications"
              ? "bg-card shadow-sm text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell size={14} />
          Notifications
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "security"
              ? "bg-card shadow-sm text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Lock size={14} />
          Security
        </button>
      </div>

      {activeTab === "notifications" ? <NotificationsTab /> : <SecurityTab />}
    </div>
  );
}
