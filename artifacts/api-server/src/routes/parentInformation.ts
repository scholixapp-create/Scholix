import { Router } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  db,
  parentInformationRequestsTable,
  studentsTable,
  usersTable,
} from "@workspace/db";
import {
  GetParentIntakeResponse,
  ListParentInformationRequestsResponse,
  UpdateParentIntakeBody,
  UpdateParentIntakeResponse,
  RespondParentInformationRequestParams,
  RespondParentInformationRequestBody,
  RespondParentInformationRequestResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/authMiddleware";
import { parentIntakeIssues, validateSignupIntake } from "../lib/parentSignup";
import { cleanStudentAddress } from "../lib/studentAddress";

const router = Router();

async function loadParentIntake(parentId: number) {
  const [parent] = await db.select({
    address: usersTable.address,
    signupIntent: usersTable.signupIntent,
    signupIntentDetails: usersTable.signupIntentDetails,
    knownTutorName: usersTable.knownTutorName,
  }).from(usersTable).where(eq(usersTable.id, parentId)).limit(1);
  if (!parent) return null;

  const students = await db.select().from(studentsTable)
    .where(and(eq(studentsTable.parentId, parentId), isNull(studentsTable.archivedAt)))
    .orderBy(studentsTable.id);
  const issues = parentIntakeIssues({
    parentAddress: parent.address ?? undefined,
    signupIntent: parent.signupIntent ?? undefined,
    signupIntentDetails: parent.signupIntentDetails ?? undefined,
    knownTutorName: parent.knownTutorName ?? undefined,
    students: students.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName ?? "",
      yearLevel: student.gradeLevel ?? "",
      school: student.school ?? undefined,
      subjects: student.subjects ?? undefined,
      goals: student.goals ?? undefined,
      address: student.address ?? "",
    })),
  });
  return {
    parentAddress: parent.address ?? null,
    signupIntent: parent.signupIntent ?? null,
    signupIntentDetails: parent.signupIntentDetails ?? null,
    knownTutorName: parent.knownTutorName ?? null,
    intakeComplete: issues.length === 0,
    intakeIssues: issues,
    students: students.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName ?? null,
      yearLevel: student.gradeLevel ?? null,
      school: student.school ?? null,
      subjects: student.subjects ?? null,
      goals: student.goals ?? null,
      address: student.address ?? null,
    })),
  };
}

router.get("/parent/intake", requireAuth, async (req, res): Promise<void> => {
  const actor = (req as AuthRequest).user;
  if (actor.role !== "parent") {
    res.status(403).json({ error: "Parent account required" });
    return;
  }
  const intake = await loadParentIntake(actor.id);
  if (!intake) {
    res.status(404).json({ error: "Parent account not found" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json(GetParentIntakeResponse.parse(intake));
});

router.put("/parent/intake", requireAuth, async (req, res): Promise<void> => {
  const actor = (req as AuthRequest).user;
  if (actor.role !== "parent") {
    res.status(403).json({ error: "Parent account required" });
    return;
  }
  const parsed = UpdateParentIntakeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a contact address, signup reason, and at least one complete student profile." });
    return;
  }

  const saved = await db.transaction(async (tx) => {
    const [parent] = await tx.select().from(usersTable)
      .where(and(eq(usersTable.id, actor.id), eq(usersTable.role, "parent")))
      .limit(1)
      .for("update");
    if (!parent || !parent.isActive || parent.archivedAt) return { kind: "not-found" as const };

    const currentStudents = await tx.select().from(studentsTable)
      .where(and(eq(studentsTable.parentId, parent.id), isNull(studentsTable.archivedAt)))
      .orderBy(studentsTable.id)
      .for("update");
    const issues = parentIntakeIssues({
      parentAddress: parsed.data.parentAddress,
      signupIntent: parsed.data.signupIntent,
      signupIntentDetails: parsed.data.signupIntentDetails,
      knownTutorName: parsed.data.knownTutorName,
      students: parsed.data.students,
    });
    if (issues.length) return { kind: "invalid" as const, error: issues.join(" ") };

    const submittedIds = parsed.data.students.flatMap((student) => student.id === undefined ? [] : [student.id]);
    if (new Set(submittedIds).size !== submittedIds.length) {
      return { kind: "invalid" as const, error: "Each existing student profile may be included only once." };
    }
    const currentById = new Map(currentStudents.map((student) => [student.id, student]));
    if (submittedIds.some((id) => !currentById.has(id))) {
      return { kind: "not-found" as const };
    }
    if (currentStudents.some((student) => !submittedIds.includes(student.id))) {
      return { kind: "invalid" as const, error: "Include every active student profile so each lesson address can be confirmed." };
    }

    const nextChildren = parsed.data.students.map((input) => {
      const address = cleanStudentAddress(input.address);
      if (!address) return null;
      return { input, address, existing: input.id === undefined ? undefined : currentById.get(input.id) };
    });
    if (nextChildren.some((child) => child === null)) {
      return { kind: "invalid" as const, error: "Enter a valid lesson address for every student." };
    }

    const intake = validateSignupIntake("parent", {
      parentAddress: parsed.data.parentAddress,
      signupIntent: parsed.data.signupIntent,
      signupIntentDetails: parsed.data.signupIntentDetails,
      knownTutorName: parsed.data.knownTutorName,
      students: parsed.data.students,
    });
    if (!intake.ok) return { kind: "invalid" as const, error: intake.error };
    const parentAddress = cleanStudentAddress(parsed.data.parentAddress);
    if (!parentAddress) return { kind: "invalid" as const, error: "Enter a valid contact address." };

    await tx.update(usersTable).set({
      address: parentAddress,
      signupIntent: intake.intake.signupIntent,
      signupIntentDetails: intake.intake.signupIntentDetails,
      knownTutorName: intake.intake.knownTutorName,
    }).where(eq(usersTable.id, parent.id));

    for (const child of nextChildren) {
      if (!child) continue;
      const { input, address, existing } = child;
      const dateOfBirth = input.dateOfBirth instanceof Date
        ? input.dateOfBirth.toISOString().slice(0, 10)
        : null;
      if (existing) {
        await tx.update(studentsTable).set({
          address,
          ...(existing.firstName.trim() ? {} : { firstName: input.firstName.trim() }),
          ...(existing.lastName?.trim() ? {} : { lastName: input.lastName.trim() }),
          ...(existing.gradeLevel?.trim() ? {} : { gradeLevel: input.yearLevel.trim() }),
        }).where(and(
          eq(studentsTable.id, existing.id),
          eq(studentsTable.parentId, parent.id),
        ));
      } else {
        await tx.insert(studentsTable).values({
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: null,
          gradeLevel: input.yearLevel.trim(),
          school: input.school?.trim() || null,
          subjects: input.subjects?.trim() || null,
          goals: input.goals?.trim() || null,
          address,
          dateOfBirth,
          parentId: parent.id,
        });
      }
    }
    return { kind: "saved" as const };
  });

  if (saved.kind === "not-found") {
    res.status(404).json({ error: "Parent or student profile not found." });
    return;
  }
  if (saved.kind === "invalid") {
    res.status(400).json({ error: saved.error });
    return;
  }

  const updated = await loadParentIntake(actor.id);
  if (!updated) {
    res.status(404).json({ error: "Parent account not found" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json(UpdateParentIntakeResponse.parse(updated));
});

router.get("/parent/information-requests", requireAuth, async (req, res): Promise<void> => {
  const actor = (req as AuthRequest).user;
  if (actor.role !== "parent") {
    res.status(403).json({ error: "Parent account required" });
    return;
  }

  const requests = await db.select().from(parentInformationRequestsTable)
    .where(eq(parentInformationRequestsTable.parentUserId, actor.id))
    .orderBy(desc(parentInformationRequestsTable.requestedAt));
  res.set("Cache-Control", "no-store");
  res.json(ListParentInformationRequestsResponse.parse(requests));
});

router.post("/parent/information-requests/:requestId/respond", requireAuth, async (req, res): Promise<void> => {
  const actor = (req as AuthRequest).user;
  if (actor.role !== "parent") {
    res.status(403).json({ error: "Parent account required" });
    return;
  }
  const params = RespondParentInformationRequestParams.safeParse(req.params);
  const body = RespondParentInformationRequestBody.safeParse(req.body);
  if (!params.success || !body.success || !body.data.responseText.trim()) {
    res.status(400).json({ error: "Enter a response before submitting" });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [request] = await tx.select().from(parentInformationRequestsTable)
      .where(eq(parentInformationRequestsTable.id, params.data.requestId))
      .limit(1)
      .for("update");
    if (!request || request.parentUserId !== actor.id) return "not-found" as const;
    if (request.status !== "pending") return "closed" as const;

    const [updated] = await tx.update(parentInformationRequestsTable)
      .set({
        responseText: body.data.responseText.trim(),
        status: "responded",
        respondedAt: new Date(),
      })
      .where(and(
        eq(parentInformationRequestsTable.id, request.id),
        eq(parentInformationRequestsTable.status, "pending"),
      ))
      .returning();
    if (!updated) return "closed" as const;
    return updated;
  });

  if (result === "not-found") {
    res.status(404).json({ error: "Information request not found" });
    return;
  }
  if (result === "closed") {
    res.status(409).json({ error: "This information request is no longer open" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json(RespondParentInformationRequestResponse.parse(result));
});

export default router;
