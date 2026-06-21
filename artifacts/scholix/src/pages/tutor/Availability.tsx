import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useListTutors, useGetTutorAvailability, useSetTutorAvailability, useUpdateTutorProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTutorAvailabilityQueryKey, getListTutorsQueryKey } from "@workspace/api-client-react";
import { CheckCircle, DollarSign, BookOpen, AlertCircle } from "lucide-react";
import { VICTORIAN_SUBJECTS } from "@/lib/subjects";
import { addDays, format, startOfTomorrow } from "date-fns";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type DayKey = typeof DAYS[number];
// JS getDay(): 0=Sun,1=Mon,...,6=Sat  →  our index: Mon=0,...,Sun=6
const JS_DAY_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
const IDX_TO_JS_DAY: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0 };

interface DaySchedule { start: string; end: string; }
type Schedule = Partial<Record<DayKey, DaySchedule>>;

interface Slot {
  id?: number;
  date: string;
  startTime: string;
  endTime: string;
  isBooked?: boolean;
}

function generateSlots(schedule: Schedule, weeksAhead = 8): { date: string; startTime: string; endTime: string }[] {
  const result: { date: string; startTime: string; endTime: string }[] = [];
  const start = startOfTomorrow();
  for (let d = 0; d < weeksAhead * 7; d++) {
    const date = addDays(start, d);
    const jsDay = date.getDay();
    const idx = JS_DAY_TO_IDX[jsDay];
    const dayKey = DAYS[idx];
    const sched = schedule[dayKey];
    if (sched && sched.end > sched.start) {
      result.push({
        date: format(date, "yyyy-MM-dd"),
        startTime: sched.start,
        endTime: sched.end,
      });
    }
  }
  return result;
}

function inferSchedule(slots: Slot[]): Schedule {
  const today = format(new Date(), "yyyy-MM-dd");
  const future = slots.filter((s) => !s.isBooked && s.date >= today);
  const byDay: Record<number, { start: string; end: string; count: number }> = {};
  for (const s of future) {
    const jsDay = new Date(s.date + "T00:00:00").getDay();
    const idx = JS_DAY_TO_IDX[jsDay];
    // Most frequent time pair per day
    if (!byDay[idx] || true) {
      byDay[idx] = { start: s.startTime, end: s.endTime, count: (byDay[idx]?.count ?? 0) + 1 };
    }
  }
  const result: Schedule = {};
  for (const [idx, info] of Object.entries(byDay)) {
    const dayKey = DAYS[Number(idx)];
    if (dayKey) result[dayKey] = { start: info.start, end: info.end };
  }
  return result;
}

export default function TutorAvailability() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const tutors = useListTutors();
  const tutorProfile = tutors.data?.find((t) => t.userId === user?.id);
  const tutorId = tutorProfile?.id;

  const availability = useGetTutorAvailability(tutorId ?? 0, {
    query: { enabled: !!tutorId } as any,
  });
  const setAvailMutation = useSetTutorAvailability();
  const updateProfileMutation = useUpdateTutorProfile();

  const [schedule, setSchedule] = useState<Schedule>({});
  const [hourlyRate, setHourlyRate] = useState(tutorProfile?.hourlyRate ?? 65);
  const [schedSaved, setSchedSaved] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);
  const [subjectsSaved, setSubjectsSaved] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(tutorProfile?.subjects ?? []);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [schedError, setSchedError] = useState("");

  // Infer schedule from existing availability data
  useEffect(() => {
    if (availability.data && availability.data.length > 0) {
      const inferred = inferSchedule(availability.data as Slot[]);
      setSchedule(inferred);
    }
  }, [availability.data]);

  useEffect(() => {
    if (tutorProfile) {
      setHourlyRate(tutorProfile.hourlyRate);
      setSelectedSubjects(tutorProfile.subjects ?? []);
    }
  }, [tutorProfile?.hourlyRate, tutorProfile?.subjects]);

  const toggleDay = (day: DayKey) => {
    setSchedule((prev) => {
      if (prev[day]) {
        const next = { ...prev };
        delete next[day];
        return next;
      }
      return { ...prev, [day]: { start: "09:00", end: "10:00" } };
    });
  };

  const updateDayTime = (day: DayKey, field: "start" | "end", value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...(prev[day] ?? { start: "09:00", end: "10:00" }), [field]: value },
    }));
  };

  const handleSaveSchedule = async () => {
    if (!tutorId) return;
    setSchedError("");

    // Validate all days have valid times
    for (const [day, times] of Object.entries(schedule) as [DayKey, DaySchedule][]) {
      if (times.end <= times.start) {
        setSchedError(`${day}: end time must be after start time`);
        return;
      }
    }

    // Keep booked slots; replace all unbooked future slots with new schedule
    const today = format(new Date(), "yyyy-MM-dd");
    const bookedSlots = (availability.data ?? [])
      .filter((s) => s.isBooked)
      .map((s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime }));

    const newSlots = generateSlots(schedule);
    const allSlots = [...bookedSlots, ...newSlots];

    try {
      await setAvailMutation.mutateAsync({ tutorId, data: { slots: allSlots } });
      await qc.invalidateQueries({ queryKey: getGetTutorAvailabilityQueryKey(tutorId) });
      setSchedSaved(true);
      setTimeout(() => setSchedSaved(false), 2500);
    } catch {
      setSchedError("Failed to save schedule. Please try again.");
    }
  };

  const handleSaveRate = async () => {
    if (!tutorId) return;
    if (hourlyRate < 65) { setRateSaved(false); return; }
    await updateProfileMutation.mutateAsync({ tutorId, data: { hourlyRate } });
    await qc.invalidateQueries({ queryKey: getListTutorsQueryKey() });
    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 2500);
  };

  const handleSaveSubjects = async () => {
    if (!tutorId || selectedSubjects.length === 0) return;
    await updateProfileMutation.mutateAsync({ tutorId, data: { subjects: selectedSubjects } });
    await qc.invalidateQueries({ queryKey: getListTutorsQueryKey() });
    setSubjectsSaved(true);
    setShowSubjectPicker(false);
    setTimeout(() => setSubjectsSaved(false), 2500);
  };

  const activeDays = DAYS.filter((d) => schedule[d]);
  const totalSlotsPerWeek = activeDays.length;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Availability</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Set your weekly teaching schedule</p>
      </div>

      {/* Weekly schedule */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Weekly Schedule</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select which days you're available. Slots are generated for the next 8 weeks.
          </p>
        </div>

        <div className="px-5 pt-4 pb-2">
          {/* Day pills */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {DAYS.map((day) => {
              const active = !!schedule[day];
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time inputs for active days */}
          {activeDays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tap a day above to add it to your schedule
            </p>
          ) : (
            <div className="space-y-3 mb-4">
              {activeDays.map((day) => {
                const times = schedule[day]!;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground w-8 shrink-0">{day}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={times.start}
                        onChange={(e) => updateDayTime(day, "start", e.target.value)}
                        className="flex-1 px-2.5 py-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">to</span>
                      <input
                        type="time"
                        value={times.end}
                        onChange={(e) => updateDayTime(day, "end", e.target.value)}
                        className="flex-1 px-2.5 py-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {schedError && (
          <div className="mx-5 mb-3 flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <AlertCircle size={13} />
            <span className="text-xs">{schedError}</span>
          </div>
        )}

        <div className="px-5 pb-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {totalSlotsPerWeek > 0
              ? `${totalSlotsPerWeek} day${totalSlotsPerWeek !== 1 ? "s" : ""}/week · ~${totalSlotsPerWeek * 8} slots generated`
              : "No days selected"}
          </span>
          <div className="flex items-center gap-2">
            {schedSaved && (
              <span className="flex items-center gap-1 text-xs text-accent font-medium">
                <CheckCircle size={12} /> Saved
              </span>
            )}
            <button
              onClick={handleSaveSchedule}
              disabled={setAvailMutation.isPending || activeDays.length === 0}
              className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {setAvailMutation.isPending ? "Saving…" : "Save schedule"}
            </button>
          </div>
        </div>
      </div>

      {/* Hourly rate */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <DollarSign size={15} className="text-accent" />
            <p className="text-sm font-semibold text-foreground">Hourly Rate</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Minimum rate is $65/hr</p>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
            <input
              type="number"
              min={65}
              step={5}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>
          <span className="text-sm text-muted-foreground shrink-0">/hr</span>
          <div className="flex items-center gap-2">
            {rateSaved && (
              <span className="flex items-center gap-1 text-xs text-accent font-medium">
                <CheckCircle size={12} /> Saved
              </span>
            )}
            <button
              onClick={handleSaveRate}
              disabled={updateProfileMutation.isPending || hourlyRate < 65}
              className="px-4 py-2.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
            >
              Save
            </button>
          </div>
        </div>
        {hourlyRate < 65 && (
          <div className="px-5 pb-4">
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle size={11} /> Minimum rate is $65/hr
            </p>
          </div>
        )}
      </div>

      {/* Subjects */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Subjects</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Select the subjects you teach</p>
        </div>
        <div className="px-5 py-4">
          {selectedSubjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedSubjects.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSubjects((prev) => prev.filter((x) => x !== s))}
                  className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors group"
                >
                  {s} <span className="group-hover:inline hidden">×</span>
                </button>
              ))}
            </div>
          )}

          {showSubjectPicker ? (
            <div className="space-y-3">
              <div className="max-h-48 overflow-y-auto border border-border rounded-xl">
                {VICTORIAN_SUBJECTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      if (selectedSubjects.includes(s)) {
                        setSelectedSubjects((prev) => prev.filter((x) => x !== s));
                      } else {
                        setSelectedSubjects((prev) => [...prev, s]);
                      }
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-border last:border-0 ${
                      selectedSubjects.includes(s)
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSubjectPicker(false)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSubjects}
                  disabled={updateProfileMutation.isPending || selectedSubjects.length === 0}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
                >
                  {subjectsSaved ? "Saved ✓" : "Save subjects"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSubjectPicker(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              {selectedSubjects.length === 0 ? "Add subjects" : "Edit subjects"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
