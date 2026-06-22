import { useState, useEffect, type ElementType } from "react";
import { Bell, Mail, CheckCircle, Calendar, BookOpen, Settings as SettingsIcon, Lock, Trash2, Eye, EyeOff, AlertCircle, KeyRound, DollarSign, Shield, User, MapPin, Phone, Save } from "lucide-react";

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

type Prefs = {
  emailNotificationsEnabled: boolean;
  notifBookingConfirmation: boolean;
  notifSessionReminder: boolean;
  notifSessionCompleted: boolean;
  notifPaymentConfirmed: boolean;
  notifApprovalUpdates: boolean;
};

const DEFAULT_PREFS: Prefs = {
  emailNotificationsEnabled: true,
  notifBookingConfirmation: true,
  notifSessionReminder: true,
  notifSessionCompleted: true,
  notifPaymentConfirmed: true,
  notifApprovalUpdates: true,
};

const EVENT_PREFS: {
  key: keyof Omit<Prefs, "emailNotificationsEnabled">;
  icon: ElementType;
  title: string;
  desc: string;
  color: string;
  bg: string;
}[] = [
  { key: "notifBookingConfirmation", icon: BookOpen, title: "Booking confirmation", desc: "When a session is booked — sent to both tutor and parent.", color: "text-primary", bg: "bg-primary/10" },
  { key: "notifSessionReminder", icon: Bell, title: "Session reminder", desc: "24 hours before a scheduled session starts.", color: "text-purple-600", bg: "bg-purple-100" },
  { key: "notifSessionCompleted", icon: CheckCircle, title: "Session completed", desc: "When a tutor marks a session as complete, including invoice summary.", color: "text-accent", bg: "bg-accent/10" },
  { key: "notifPaymentConfirmed", icon: DollarSign, title: "Payment confirmed", desc: "When your session payment is processed successfully.", color: "text-green-600", bg: "bg-green-100" },
  { key: "notifApprovalUpdates", icon: Shield, title: "Account & approval updates", desc: "Tutor verification decisions and important account notices.", color: "text-amber-600", bg: "bg-amber-100" },
];

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none shrink-0 ${on ? "bg-primary" : "bg-muted-foreground/30"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json())
      .then((data) => { setPrefs({ ...DEFAULT_PREFS, ...data }); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const savePref = async (key: keyof Prefs, next: boolean) => {
    setPrefs((p) => ({ ...p, [key]: next }));
    setSavingKey(key);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ [key]: next }),
      });
    } catch {
      setPrefs((p) => ({ ...p, [key]: !next }));
    } finally {
      setSavingKey(null);
    }
  };

  const masterOn = prefs.emailNotificationsEnabled;

  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-0.5">
            <Mail size={15} className="text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Email Notifications</h2>
          </div>
          <p className="text-xs text-muted-foreground">Master switch for all email updates from Scholix</p>
        </div>
        <div className="px-5 py-4">
          {loading ? (
            <div className="h-10 rounded-lg bg-muted animate-pulse" />
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {masterOn ? "Email notifications on" : "All email notifications paused"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {masterOn ? "Toggle individual events below" : "Turn on to configure per-event preferences"}
                </p>
              </div>
              <Toggle
                on={masterOn}
                onToggle={() => savePref("emailNotificationsEnabled", !masterOn)}
                disabled={savingKey === "emailNotificationsEnabled"}
              />
            </div>
          )}
        </div>
      </div>

      {/* Per-event toggles */}
      <div className={`bg-card border border-card-border rounded-2xl overflow-hidden transition-opacity ${masterOn ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email events</p>
        </div>
        <div className="divide-y divide-border">
          {EVENT_PREFS.map(({ key, icon: Icon, title, desc, color, bg }) => (
            <div key={key} className="flex items-center gap-3 px-5 py-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={15} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <Toggle
                on={prefs[key]}
                onToggle={() => savePref(key, !prefs[key])}
                disabled={!masterOn || savingKey === key}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        In-app notifications are always delivered regardless of these settings.
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

function ProfileTab() {
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json())
      .then((data) => {
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ phone, address }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-0.5">
            <User size={15} className="text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Contact Details</h2>
          </div>
          <p className="text-xs text-muted-foreground">Shown on invoice PDFs issued to you</p>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            <div className="h-10 rounded-lg bg-muted animate-pulse" />
            <div className="h-10 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Phone size={12} /> Mobile number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="04XX XXX XXX"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <MapPin size={12} /> Home address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Street, Suburb VIC 3000"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              <Save size={14} />
              {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"notifications" | "security" | "profile">("notifications");

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
          onClick={() => setActiveTab("profile")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "profile"
              ? "bg-card shadow-sm text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User size={14} />
          Profile
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

      {activeTab === "notifications" ? <NotificationsTab /> : activeTab === "profile" ? <ProfileTab /> : <SecurityTab />}
    </div>
  );
}
