import { useState } from "react";
import { useListStudents, useCreateStudent } from "@workspace/api-client-react";
import { getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { GraduationCap, Plus, X, CheckCircle, AlertCircle, User } from "lucide-react";
import { format, parseISO } from "date-fns";

const GRADE_LEVELS = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9 (Freshman)", "Grade 10 (Sophomore)",
  "Grade 11 (Junior)", "Grade 12 (Senior)", "College Freshman", "College Sophomore",
  "College Junior", "College Senior", "Graduate Student",
];

interface StudentCardProps {
  student: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    gradeLevel: string | null;
    createdAt: string;
  };
}

function StudentCard({ student }: StudentCardProps) {
  const initials = `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex items-start gap-3">
      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-primary">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{student.firstName} {student.lastName}</p>
        {student.gradeLevel && (
          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
            {student.gradeLevel}
          </span>
        )}
        <p className="text-xs text-muted-foreground mt-1.5">{student.email}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Added {format(parseISO(student.createdAt), "MMM d, yyyy")}
        </p>
      </div>
    </div>
  );
}

function AddStudentModal({
  parentId,
  onClose,
  onSuccess,
}: {
  parentId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createStudent = useCreateStudent();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    createStudent.mutate(
      {
        data: {
          firstName,
          lastName,
          email,
          gradeLevel: gradeLevel || undefined,
          parentId,
        },
      },
      {
        onSuccess: () => onSuccess(),
        onError: () => setError("Could not add student. Please check the details and try again."),
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Add a student</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enter your child's details</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Emma"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="emma@example.com"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Used for session reminders and communication</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Grade level <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select grade...</option>
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createStudent.isPending}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-1.5"
            >
              {createStudent.isPending ? (
                "Adding..."
              ) : (
                <><Plus size={14} /> Add student</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ParentStudents() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const students = useListStudents();
  const [showModal, setShowModal] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const myStudents = students.data?.filter(
    (s) => s.parentId === user?.id || s.parentId == null
  ) ?? [];

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
    students.refetch().then((result) => {
      const newest = result.data
        ?.filter((s) => s.parentId === user?.id || s.parentId == null)
        .at(-1);
      if (newest) {
        setJustAdded(`${newest.firstName} ${newest.lastName}`);
        setTimeout(() => setJustAdded(null), 4000);
      }
    });
    setShowModal(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      {showModal && user && (
        <AddStudentModal
          parentId={user.id}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Students</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {myStudents.length} student{myStudents.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={15} />
          Add student
        </button>
      </div>

      {/* Success toast */}
      {justAdded && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 text-accent text-sm font-medium mb-4 border border-accent/20">
          <CheckCircle size={16} />
          {justAdded} has been added successfully!
        </div>
      )}

      {students.isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : myStudents.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={24} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">No students yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Add your children so you can book tutoring sessions for them
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={15} />
            Add your first student
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {myStudents.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}

          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Plus size={16} />
            Add another student
          </button>
        </div>
      )}

      {/* Info card */}
      <div className="mt-6 bg-muted/50 border border-border rounded-xl p-4">
        <div className="flex items-start gap-2">
          <User size={14} className="text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">How students work</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              When you book a session, you select which student the session is for. Tutors see the student's name and grade level to help them prepare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
