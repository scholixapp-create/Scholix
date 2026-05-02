import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useListTutors, useGetTutorAvailability, useSetTutorAvailability, useUpdateTutorProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTutorAvailabilityQueryKey, getListTutorsQueryKey } from "@workspace/api-client-react";
import { Plus, Trash2, CheckCircle, DollarSign } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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

  useEffect(() => {
    if (availability.data) {
      setSlots(availability.data.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })));
    }
  }, [availability.data]);

  useEffect(() => {
    if (tutorProfile) setHourlyRate(tutorProfile.hourlyRate);
  }, [tutorProfile?.hourlyRate]);

  const addSlot = () => {
    setSlots([...slots, { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }]);
  };

  const removeSlot = (i: number) => {
    setSlots(slots.filter((_, idx) => idx !== i));
  };

  const updateSlot = (i: number, field: keyof Slot, value: string | number) => {
    setSlots(slots.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const handleSave = () => {
    if (!tutorId) return;
    setAvailMutation.mutate(
      { tutorId, data: { slots } },
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
      { tutorId, data: { hourlyRate } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTutorsQueryKey() });
          setRateSaved(true);
          setTimeout(() => setRateSaved(false), 2500);
        },
      }
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Availability</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Set when parents can book sessions with you</p>
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

      {/* Time slots */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Weekly availability</h2>

        {availability.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No time slots yet. Add your first one below.</p>
        ) : (
          <div className="space-y-3 mb-4">
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <select
                  value={slot.dayOfWeek}
                  onChange={(e) => updateSlot(i, "dayOfWeek", Number(e.target.value))}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {DAYS.map((d, idx) => (
                    <option key={idx} value={idx}>{d}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => removeSlot(i)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={addSlot}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus size={16} />
          Add time slot
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={setAvailMutation.isPending}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
      >
        {saved ? <><CheckCircle size={16} /> Availability saved!</> : setAvailMutation.isPending ? "Saving..." : "Save availability"}
      </button>
    </div>
  );
}
