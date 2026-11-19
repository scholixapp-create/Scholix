export type ParentSignupStudentInput = {
  firstName: string;
  lastName: string;
  yearLevel: string;
  school?: string;
  subjects?: string;
  goals?: string;
  dateOfBirth?: Date | string;
  address: string;
};

export type SignupIntakeInput = {
  signupIntent?: string;
  signupIntentDetails?: string;
  knownTutorName?: string;
  students?: ParentSignupStudentInput[];
};

export type SignupIntake = {
  signupIntent: "knows_tutor" | "find_tutor" | "tutor_tools" | "other";
  signupIntentDetails: string | null;
  knownTutorName: string | null;
  students: ParentSignupStudentInput[];
};

export type SignupIntakeResult =
  | { ok: true; intake: SignupIntake }
  | { ok: false; error: string };

export function validateSignupIntake(role: "parent" | "tutor", input: SignupIntakeInput): SignupIntakeResult {
  const intent = input.signupIntent;
  const details = input.signupIntentDetails?.trim() || null;
  const knownTutorName = input.knownTutorName?.trim() || null;

  if (role === "parent" && intent !== "knows_tutor" && intent !== "find_tutor" && intent !== "other") {
    return { ok: false, error: "Choose what brought you to Scholix." };
  }
  if (role === "tutor" && intent !== "tutor_tools" && intent !== "other") {
    return { ok: false, error: "Choose what brought you to Scholix." };
  }
  if (intent === "knows_tutor" && !knownTutorName) {
    return { ok: false, error: "Enter the tutor's name so we can connect you." };
  }
  if (intent === "other" && !details) {
    return { ok: false, error: "Please tell us what brought you to Scholix." };
  }

  const students = input.students ?? [];
  if (role === "parent") {
    if (students.length < 1) {
      return { ok: false, error: "Add at least one student profile to create a new parent account." };
    }
    if (students.some((student) =>
      !student.firstName.trim()
      || !student.lastName.trim()
      || !student.yearLevel.trim()
      || !student.address.trim()
    )) {
      return { ok: false, error: "Each student needs a first name, last name, year level, and lesson address." };
    }
  }

  return {
    ok: true,
    intake: {
      signupIntent: intent as SignupIntake["signupIntent"],
      signupIntentDetails: intent === "other" ? details : null,
      knownTutorName: intent === "knows_tutor" ? knownTutorName : null,
      students: role === "parent" ? students : [],
    },
  };
}
