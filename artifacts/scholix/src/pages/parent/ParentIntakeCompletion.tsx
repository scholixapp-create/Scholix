import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetParentIntakeQueryKey,
  useGetParentIntake,
  useUpdateParentIntake,
  type ParentIntakeUpdate,
  type ParentIntakeStudentInput,
} from "@workspace/api-client-react";

function errorMessage(error: unknown) {
  const value = error as { data?: { error?: unknown }; message?: string };
  if (typeof value?.data?.error === "string") return value.data.error;
  return value?.message ?? "Could not save your details. Please try again.";
}

const blankStudent = (): ParentIntakeStudentInput => ({
  firstName: "",
  lastName: "",
  yearLevel: "",
  address: "",
});

type ParentIntakeForm = Omit<ParentIntakeUpdate, "signupIntent"> & {
  signupIntent: ParentIntakeUpdate["signupIntent"] | "";
};

export default function ParentIntakeCompletion({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const intake = useGetParentIntake({
    query: {
      queryKey: getGetParentIntakeQueryKey(),
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    },
  });
  const update = useUpdateParentIntake();
  const [form, setForm] = useState<ParentIntakeForm | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!intake.data) return;
    if (intake.data.intakeComplete) {
      setForm(null);
      return;
    }
    setForm({
      parentAddress: intake.data.parentAddress ?? "",
      signupIntent: intake.data.signupIntent === "knows_tutor" || intake.data.signupIntent === "other" || intake.data.signupIntent === "find_tutor"
        ? intake.data.signupIntent
        : "",
      ...(intake.data.signupIntentDetails ? { signupIntentDetails: intake.data.signupIntentDetails } : {}),
      ...(intake.data.knownTutorName ? { knownTutorName: intake.data.knownTutorName } : {}),
      students: intake.data.students.length
        ? intake.data.students.map((student) => ({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName ?? "",
            yearLevel: student.yearLevel ?? "",
            ...(student.school ? { school: student.school } : {}),
            ...(student.subjects ? { subjects: student.subjects } : {}),
            ...(student.goals ? { goals: student.goals } : {}),
            address: student.address ?? "",
          }))
        : [blankStudent()],
    });
  }, [intake.data]);

  const setStudent = (index: number, patch: Partial<ParentIntakeStudentInput>) => {
    setForm((current) => current ? ({
      ...current,
      students: current.students.map((student, studentIndex) =>
        studentIndex === index ? { ...student, ...patch } : student),
    }) : current);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setError("");
    setSuccess("");
    if (!form.signupIntent) {
      setError("Choose what brought you to Scholix.");
      return;
    }
    update.mutate({ data: form as ParentIntakeUpdate }, {
      onSuccess: async (saved) => {
        await queryClient.setQueryData(getGetParentIntakeQueryKey(), saved);
        await queryClient.invalidateQueries({ queryKey: getGetParentIntakeQueryKey() });
        setSuccess("Your details are saved. If an administrator requested information, reply to that request below.");
      },
      onError: (reason) => setError(errorMessage(reason)),
    });
  };

  if (intake.isLoading) return null;
  if (intake.isError || !intake.data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
        Could not load your required signup details.
        <button type="button" onClick={() => intake.refetch()} className="ml-2 font-semibold underline">Try again</button>
      </div>
    );
  }
  if (intake.data.intakeComplete) {
    return success ? (
      <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800" role="status" data-testid="text-parent-intake-success">
        Your required signup details are complete. If an administrator requested information, you can reply below.
      </p>
    ) : null;
  }
  if (!form) return null;

  return (
    <section
      className={`rounded-xl border border-amber-300 bg-amber-50 ${compact ? "p-4" : "p-5"}`}
      aria-labelledby="parent-intake-completion-heading"
      data-testid="section-parent-intake-completion"
    >
      <h2 id="parent-intake-completion-heading" className="text-sm font-semibold text-amber-950">
        Complete your parent profile
      </h2>
      <p className="mt-1 text-xs text-amber-900">
        Add the missing details below. Your contact address stays on your parent profile and is not copied to a student’s lesson address.
      </p>
      {intake.data.intakeIssues.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-900">
          {intake.data.intakeIssues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      )}

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="parent-intake-address" className="mb-1 block text-xs font-medium text-foreground">
            Parent or guardian contact address
          </label>
          <input
            id="parent-intake-address"
            autoComplete="street-address"
            maxLength={500}
            required
            value={form.parentAddress}
            onChange={(event) => setForm((current) => current ? { ...current, parentAddress: event.target.value } : current)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            data-testid="input-parent-intake-address"
          />
        </div>

        <div>
          <label htmlFor="parent-intake-reason" className="mb-1 block text-xs font-medium text-foreground">
            What brought you to Scholix?
          </label>
          <select
            id="parent-intake-reason"
            required
            value={form.signupIntent}
            onChange={(event) => setForm((current) => current ? {
              ...current,
              signupIntent: event.target.value as ParentIntakeForm["signupIntent"],
            } : current)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            data-testid="select-parent-intake-reason"
          >
            <option value="" disabled>Select one…</option>
            <option value="find_tutor">I’m looking for a tutor</option>
            <option value="knows_tutor">I know a particular tutor</option>
            <option value="other">Something else</option>
          </select>
        </div>

        {form.signupIntent === "knows_tutor" && (
          <div>
            <label htmlFor="parent-intake-known-tutor" className="mb-1 block text-xs font-medium text-foreground">Tutor’s name</label>
            <input
              id="parent-intake-known-tutor"
              required
              maxLength={200}
              value={form.knownTutorName ?? ""}
              onChange={(event) => setForm((current) => current ? { ...current, knownTutorName: event.target.value } : current)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              data-testid="input-parent-intake-known-tutor"
            />
          </div>
        )}
        {form.signupIntent === "other" && (
          <div>
            <label htmlFor="parent-intake-reason-details" className="mb-1 block text-xs font-medium text-foreground">Please tell us more</label>
            <textarea
              id="parent-intake-reason-details"
              required
              maxLength={1000}
              rows={2}
              value={form.signupIntentDetails ?? ""}
              onChange={(event) => setForm((current) => current ? { ...current, signupIntentDetails: event.target.value } : current)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              data-testid="input-parent-intake-reason-details"
            />
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-foreground">Student profiles and lesson addresses</h3>
          {form.students.map((student, index) => {
            const existing = student.id !== undefined;
            const canEditName = !existing || !student.firstName.trim();
            const canEditLastName = !existing || !student.lastName.trim();
            const canEditYear = !existing || !student.yearLevel.trim();
            return (
              <fieldset key={student.id ?? `new-${index}`} className="space-y-2 rounded-lg border border-amber-200 bg-white/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">Student {index + 1}</p>
                  {!existing && form.students.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setForm((current) => current ? {
                        ...current,
                        students: current.students.filter((_, studentIndex) => studentIndex !== index),
                      } : current)}
                      className="text-xs font-medium text-destructive hover:underline"
                      data-testid={`button-remove-parent-intake-student-${index + 1}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    aria-label={`Student ${index + 1} first name`}
                    placeholder="First name"
                    required
                    maxLength={100}
                    readOnly={!canEditName}
                    value={student.firstName}
                    onChange={(event) => setStudent(index, { firstName: event.target.value })}
                    className="min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm read-only:bg-muted"
                  />
                  <input
                    aria-label={`Student ${index + 1} last name`}
                    placeholder="Last name"
                    required
                    maxLength={100}
                    readOnly={!canEditLastName}
                    value={student.lastName}
                    onChange={(event) => setStudent(index, { lastName: event.target.value })}
                    className="min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm read-only:bg-muted"
                  />
                  <input
                    aria-label={`Student ${index + 1} year level`}
                    placeholder="Year level"
                    required
                    maxLength={100}
                    readOnly={!canEditYear}
                    value={student.yearLevel}
                    onChange={(event) => setStudent(index, { yearLevel: event.target.value })}
                    className="min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm read-only:bg-muted"
                  />
                  <input
                    aria-label={`Student ${index + 1} lesson address`}
                    placeholder="Lesson address"
                    required
                    maxLength={500}
                    value={student.address}
                    onChange={(event) => setStudent(index, { address: event.target.value })}
                    className="min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    data-testid={`input-parent-intake-student-address-${index + 1}`}
                  />
                </div>
              </fieldset>
            );
          })}
          {form.students.length < 20 && (
            <button
              type="button"
              onClick={() => setForm((current) => current ? { ...current, students: [...current.students, blankStudent()] } : current)}
              className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-primary hover:bg-white"
              data-testid="button-add-parent-intake-student"
            >
              Add a student profile
            </button>
          )}
        </div>

        {error && <p className="text-sm text-destructive" role="alert" data-testid="text-parent-intake-error">{error}</p>}
        {success && <p className="text-sm text-emerald-800" role="status" data-testid="text-parent-intake-success">{success}</p>}
        <button
          type="submit"
          disabled={update.isPending}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          data-testid="button-save-parent-intake"
        >
          {update.isPending ? "Saving details…" : "Save required details"}
        </button>
      </form>
    </section>
  );
}
