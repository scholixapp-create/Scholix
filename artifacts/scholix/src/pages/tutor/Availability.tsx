import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useListTutors, useGetTutorAvailability, useSetTutorAvailability, useUpdateTutorProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTutorAvailabilityQueryKey, getListTutorsQueryKey } from "@workspace/api-client-react";
import { Plus, Trash2, CheckCircle, DollarSign, BookOpen, Calendar } from "lucide-react";
import { format, parseISO, isBefore, startOfToday } from "date-fns";
import { VICTORIAN_SUBJECTS } from "@/lib/subjects";

interface Slot {
  id?: number;
  date: string;
  startTime: string;
  endTime: string;
  isBooked?: boolean;
}

function slotDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export default function TutorAvailability() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const tutors = useListTutors();
  const tutorProfile = tutors.data?.find((t) => t.userId === user?.id);
  const tutorId = tutorProfile?.id;

  const availability = useGetTutorAvailability(tutorId ?? 0, {
    query: { enabled: !!tutorId },
  });
  const setAvailMutation = useSetTutorAvailability();
  const updateProfileMutation = useUpdateTutorProfile();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [hourlyRate, setHourlyRate] = useState(tutorProfile?.hourlyRate ?? 65);
  const [saved, setSaved] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);
  const [subjectsSaved, setSubjectsSaved] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(tutorProfile?.subjects ?? []);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (availability.data) {
      setSlots(
        availability.data.map((s) => ({
          id: s.id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          isBooked: s.isBooked,
        }))
      );
    }
  }, [availability.data]);

  useEffect(() => {
    if (tutorProfile) {
      setHourlyRate(tutorProfile.hourlyRate);
      setSelectedSubjects(tutorProfile.subjects ?? []);
    }
  }, [tutorProfile?.hourlyRate, tutorProfile?.subjects]);

  const addSlot = () => {
    setAddError("");
    if (!newDate) { setAddError("Select a date"); return; }
    if (newEnd <= newStart) { setAddError("End time must be after start time"); return; }
    const dur = slotDuration(newStart, newEnd);
    if (dur < 30) { setAddError("Minimum slot duration is 30 minutes"); return; }
    setSlots([...slots, { date: newDate, startTime: newStart, endTime: newEnd, isBooked: false }]);
  };

  const removeSlot = (i: number) => {
    setSlots(slots.filter((_, idx) => idx !== i));
  };

  const handleSave = () => {
    if (!tutorId) return;
    setAvailMutation.mutate(
      { tutorId, data: { slots: slots.map((s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime })) } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetTutorAvailabilityQueryKey(tutorId) });
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
      }
    );
  };

  const handleSaveRate = () => {
    if (!tutorId) return;
    if (hourlyRate < 65) { alert("Minimum rate is $65/hr"); return; }
    updateProfileMutation.mutate(
      { tutorId, data: { hourlyRate: hourlyRate } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTutorsQueryKey() });
          setRateSaved(true);
          setTimeout(() => setRateSaved(false), 2500);
        },
      }
    );
  };

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSaveSubjects = () => {
    if (!tutorId) return;
    updateProfileMutation.mutate(
      { tutorId, data: { subjects: selectedSubjects } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTutorsQueryKey() });
          setSubjectsSaved(true);
          setShowSubjectPicker(false);
          setTimeout(() => setSubjectsSaved(false), 2500);
        },
      }
    );
  };

  const today = startOfToday();
  const futureSlots = slots.filter((s) => {
    try { return !isBefore(parseISO(s.date), today); } catch { return true; }
  });
  const pastSlots = slots.filter((s) => {
    try { return isBefore(parseISO(s.date), today); } catch { return false; }
  });

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Availability & Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Set your schedule, rate and teaching subjects</p>
      </div>

      {/* Hourly rate */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={16} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Hourly rate</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center border border-input rounded-lg overflow-hidden">
            <span className="px-3 py-2.5 bg-muted text-sm text-muted-foreground font-medium border-r border-input">$</span>
            <input
              type="number"
              min={65}
              step={5}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="flex-1 px-3 py-2.5 bg-background text-sm focus:outline-none"
            />
            <span className="px-3 py-2.5 bg-muted text-sm text-muted-foreground border-l border-input">/hr</span>
          </div>
          <button
            onClick={handleSaveRate}
            disabled={updateProfileMutation.isPending}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center gap-1.5 shrink-0"
          >
            {rateSaved ? <><CheckCircle size={14} /> Saved</> : "Save rate"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Minimum $65/hr. Parents see this when browsing tutors.</p>
      </div>

      {/* Subjects */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Teaching subjects</h2>
          </div>
          <button
            onClick={() => setShowSubjectPicker(!showSubjectPicker)}
            className="text-xs text-primary font-medium hover:underline"
          >
            {showSubjectPicker ? "Close" : "Edit"}
          </button>
        </div>

        {selectedSubjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">No subjects set. Click Edit to add subjects.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedSubjects.map((sub) => (
              <span key={sub} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {sub}
              </span>
            ))}
          </div>
        )}

        {showSubjectPicker && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">Tap to toggle. Victorian curriculum subjects.</p>
            <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
              {VICTORIAN_SUBJECTS.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => toggleSubject(sub)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedSubjects.includes(sub)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {selectedSubjects.includes(sub) ? "✓ " : ""}{sub}
                </button>
              ))}
            </div>
            <button
              onClick={handleSaveSubjects}
              disabled={updateProfileMutation.isPending}
              className="mt-3 w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
            >
              {subjectsSaved ? <><CheckCircle size={14} /> Subjects saved!</> : `Save ${selectedSubjects.length} subjects`}
            </button>
          </div>
        )}
      </div>

      {/* Availability slots */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Available date slots</h2>
        </div>

        {/* Add slot form */}
        <div className="bg-muted/40 rounded-xl p-3 mb-4">
          <p className="text-xs font-semibold text-foreground mb-3">Add a new slot</p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="col-span-3">
              <label className="text-[11px] text-muted-foreground font-medium">Date</label>
              <input
                type="date"
                value={newDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Start</label>
              <input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">End</label>
              <input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addSlot}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
          {addError && <p className="text-xs text-destructive mt-1">{addError}</p>}
          {newStart && newEnd && newEnd > newStart && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Duration: {slotDuration(newStart, newEnd)} min
            </p>
          )}
        </div>

        {/* Slot list */}
        {availability.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No slots yet. Add your first available date above.
          </p>
        ) : (
          <div className="space-y-2">
            {futureSlots.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
                {futureSlots.map((slot, i) => {
                  const globalIdx = slots.indexOf(slot);
                  const dur = slotDuration(slot.startTime, slot.endTime);
                  let dateLabel = slot.date;
                  try { dateLabel = format(parseISO(slot.date), "EEE, d MMM yyyy"); } catch { /* noop */ }
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-3 rounded-xl border ${
                        slot.isBooked
                          ? "bg-amber-50 border-amber-200"
                          : "bg-accent/5 border-accent/20"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{dateLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {slot.startTime} – {slot.endTime} · {dur} min
                          {slot.isBooked && <span className="ml-2 text-amber-600 font-medium">· Booked</span>}
                        </p>
                      </div>
                      {!slot.isBooked && (
                        <button
                          onClick={() => removeSlot(globalIdx)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            {pastSlots.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Past</p>
                {pastSlots.map((slot, i) => {
                  const globalIdx = slots.indexOf(slot);
                  let dateLabel = slot.date;
                  try { dateLabel = format(parseISO(slot.date), "EEE, d MMM yyyy"); } catch { /* noop */ }
                  return (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/30 opacity-60">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-through">{dateLabel}</p>
                        <p className="text-xs text-muted-foreground">{slot.startTime} – {slot.endTime}</p>
                      </div>
                      <button
                        onClick={() => removeSlot(globalIdx)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={setAvailMutation.isPending}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
      >
        {saved ? <><CheckCircle size={16} /> Schedule saved!</> : setAvailMutation.isPending ? "Saving..." : "Save schedule"}
      </button>
    </div>
  );
}
