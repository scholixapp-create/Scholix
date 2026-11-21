export type ParentSignupStudentInput = {
  id?: number;
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
  parentAddress?: string;
  signupIntent?: string;
  signupIntentDetails?: string;
  knownTutorName?: string;
  students?: ParentSignupStudentInput[];
};

export type SignupIntake = {
  parentAddress: string | null;
  signupIntent: "knows_tutor" | "find_tutor" | "tutor_tools" | "other";
  signupIntentDetails: string | null;
  knownTutorName: string | null;
  students: ParentSignupStudentInput[];
};

export type SignupIntakeResult =
  | { ok: true; intake: SignupIntake }
  | { ok: false; error: string };

export function parentIntakeIssues(input: SignupIntakeInput): string[] {
  const issues: string[] = [];
  const intent = input.signupIntent;
  const details = input.signupIntentDetails?.trim() || null;
  const knownTutorName = input.knownTutorName?.trim() || null;

  if (!input.parentAddress?.trim()) issues.push("Enter the parent or guardian contact address.");
  if (intent !== "knows_tutor" && intent !== "find_tutor" && intent !== "other") {
    issues.push("Choose what brought you to Scholix.");
  }
  if (intent === "knows_tutor" && !knownTutorName) {
    issues.push("Enter the tutor's name so we can connect you.");
  }
  if (intent === "other" && !details) {
    issues.push("Please tell us what brought you to Scholix.");
  }

  const students = input.students ?? [];
  if (students.length < 1) {
    issues.push("Add at least one student profile to create a new parent account.");
  } else if (students.some((student) =>
    !student.firstName.trim()
    || !student.lastName.trim()
    || !student.yearLevel.trim()
    || !student.address.trim()
  )) {
    issues.push("Each student needs a first name, last name, year level, and lesson address.");
  }
  return issues;
}

export function validateSignupIntake(role: "parent" | "tutor", input: SignupIntakeInput): SignupIntakeResult {
  const intent = input.signupIntent;
  const details = input.signupIntentDetails?.trim() || null;
  const knownTutorName = input.knownTutorName?.trim() || null;

  if (role === "parent") {
    const issues = parentIntakeIssues(input);
    if (issues.length) return { ok: false, error: issues[0] };
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

  return {
    ok: true,
    intake: {
      parentAddress: role === "parent" ? input.parentAddress!.trim() : null,
      signupIntent: intent as SignupIntake["signupIntent"],
      signupIntentDetails: intent === "other" ? details : null,
      knownTutorName: intent === "knows_tutor" ? knownTutorName : null,
      students: role === "parent" ? students : [],
    },
  };
}
