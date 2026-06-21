import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useListTutors, useUpdateTutorProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListTutorsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ChevronRight, CheckCircle, ExternalLink, User, BookOpen, Clock } from "lucide-react";

export default function TutorProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const tutors = useListTutors();
  const tutorProfile = tutors.data?.find((t) => t.userId === user?.id);
  const tutorId = tutorProfile?.id;
  const updateProfile = useUpdateTutorProfile();

  const [bio, setBio] = useState(tutorProfile?.bio ?? "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tutorProfile?.bio !== undefined) setBio(tutorProfile.bio ?? "");
  }, [tutorProfile?.bio]);

  const handleSaveBio = async () => {
    if (!tutorId) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateProfile.mutateAsync({
        tutorId,
        data: { bio },
      });
      await qc.invalidateQueries({ queryKey: getListTutorsQueryKey() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save bio. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();
  const profileUrl = tutorId ? `${window.location.origin}/tutors?id=${tutorId}` : null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">What parents and students see about you</p>
      </div>

      {/* Avatar */}
      <div className="bg-card border border-card-border rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-white">{initials || <User size={24} />}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
            {tutorProfile && (
              <p className="text-sm text-muted-foreground mt-0.5">${tutorProfile.hourlyRate}/hr</p>
            )}
          </div>
        </div>

        {profileUrl && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Public profile link</p>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground truncate flex-1">{profileUrl}</p>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Bio editor */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-sm font-semibold text-foreground">About me</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tell parents and students about your teaching style and experience</p>
        </div>
        <div className="p-5">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g. I'm a passionate maths and science tutor with 5 years of experience helping VCE students achieve their goals…"
            rows={5}
            maxLength={800}
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">{bio.length}/800 characters</span>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="flex items-center gap-1 text-xs text-accent font-medium">
                  <CheckCircle size={12} /> Saved
                </span>
              )}
              {error && <span className="text-xs text-destructive">{error}</span>}
              <button
                onClick={handleSaveBio}
                disabled={saving || !tutorId}
                className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {saving ? "Saving…" : "Save bio"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Settings</p>
        <Link
          href="/tutor/availability"
          className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border hover:border-primary/40 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Clock size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Availability & Rate</p>
            <p className="text-xs text-muted-foreground mt-0.5">Set your weekly schedule and hourly rate</p>
          </div>
          <ChevronRight size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
        <Link
          href="/tutor/availability"
          className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border hover:border-primary/40 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <BookOpen size={16} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Subjects</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tutorProfile?.subjects && tutorProfile.subjects.length > 0
                ? tutorProfile.subjects.slice(0, 3).join(", ") + (tutorProfile.subjects.length > 3 ? ` +${tutorProfile.subjects.length - 3}` : "")
                : "Add subjects you teach"}
            </p>
          </div>
          <ChevronRight size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
      </div>
    </div>
  );
}
