import { Router, Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, tutorsTable, tutorDocumentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/authMiddleware";

const router = Router();

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${unique}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF and image files are allowed"));
  },
});

function getUserId(req: Request): number | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const decoded = Buffer.from(auth.slice(7), "base64").toString("utf-8");
    const id = parseInt(decoded.split(":")[0], 10);
    return isNaN(id) ? null : id;
  } catch { return null; }
}

// ── Tutor-facing routes ──────────────────────────────────────────────────────

// GET /api/tutors/me  — own profile with verification status (includes WWCC for own use)
router.get("/tutors/me", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [row] = await db
    .select()
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.userId, userId))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Tutor profile not found" }); return; }

  const docs = await db
    .select()
    .from(tutorDocumentsTable)
    .where(eq(tutorDocumentsTable.tutorId, row.tutors.id));

  res.json({
    id: row.tutors.id,
    userId: row.tutors.userId,
    firstName: row.users.firstName,
    lastName: row.users.lastName,
    email: row.users.email,
    bio: row.tutors.bio,
    subjects: row.tutors.subjects,
    hourlyRate: row.tutors.hourlyRate,
    isApproved: row.tutors.isApproved,
    verificationStatus: row.tutors.verificationStatus,
    // WWCC data is returned to the tutor for their own profile view only
    wwccNumber: row.tutors.wwccNumber,
    wwccExpiry: row.tutors.wwccExpiry,
    educationDetails: row.tutors.educationDetails,
    abn: row.tutors.abn ?? null,
    documents: docs.map((d) => ({
      id: d.id,
      docType: d.docType,
      originalName: d.originalName,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
  });
});

// PUT /api/tutors/me/details  — update WWCC + education info
router.put("/tutors/me/details", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { wwccNumber, wwccExpiry, educationDetails, abn } = req.body as Record<string, string>;

  const [tutor] = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(eq(tutorsTable.userId, userId))
    .limit(1);

  if (!tutor) { res.status(404).json({ error: "Tutor not found" }); return; }

  const updates: Record<string, string | undefined> = { wwccNumber, wwccExpiry, educationDetails };
  if (abn !== undefined) updates.abn = abn;

  await db.update(tutorsTable).set(updates).where(eq(tutorsTable.id, tutor.id));

  res.json({ success: true });
});

// POST /api/tutors/me/documents  — upload a document
router.post("/tutors/me/documents", upload.single("file"), async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const { docType } = req.body as { docType?: string };
  if (!docType || !["wwcc", "education"].includes(docType)) {
    res.status(400).json({ error: "docType must be 'wwcc' or 'education'" });
    return;
  }

  const [tutor] = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(eq(tutorsTable.userId, userId))
    .limit(1);

  if (!tutor) { res.status(404).json({ error: "Tutor not found" }); return; }

  const [doc] = await db
    .insert(tutorDocumentsTable)
    .values({
      tutorId: tutor.id,
      docType,
      originalName: req.file.originalname,
      filePath: req.file.filename,
    })
    .returning();

  res.status(201).json({ id: doc.id, docType: doc.docType, originalName: doc.originalName });
});

// POST /api/tutors/me/submit-verification  — mark as submitted for admin review
router.post("/tutors/me/submit-verification", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [tutor] = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(eq(tutorsTable.userId, userId))
    .limit(1);

  if (!tutor) { res.status(404).json({ error: "Tutor not found" }); return; }

  await db
    .update(tutorsTable)
    .set({ verificationStatus: "pending" })
    .where(eq(tutorsTable.id, tutor.id));

  res.json({ success: true });
});

// ── Admin routes (require admin role) ───────────────────────────────────────

// GET /api/admin/tutors/all  — all tutors with full WWCC details + audit trail (admin only)
router.get("/admin/tutors/all", requireAdmin, async (_req, res) => {
  const tutors = await db
    .select()
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id));

  const withDocs = await Promise.all(
    tutors.map(async (row) => {
      const docs = await db
        .select()
        .from(tutorDocumentsTable)
        .where(eq(tutorDocumentsTable.tutorId, row.tutors.id));

      // Resolve verifier name if present
      let verifiedByName: string | null = null;
      if (row.tutors.wwccVerifiedBy) {
        const [verifier] = await db
          .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
          .from(usersTable)
          .where(eq(usersTable.id, row.tutors.wwccVerifiedBy))
          .limit(1);
        if (verifier) verifiedByName = `${verifier.firstName} ${verifier.lastName}`;
      }

      return {
        id: row.tutors.id,
        userId: row.tutors.userId,
        firstName: row.users.firstName,
        lastName: row.users.lastName,
        email: row.users.email,
        bio: row.tutors.bio,
        subjects: row.tutors.subjects,
        hourlyRate: row.tutors.hourlyRate,
        isApproved: row.tutors.isApproved,
        verificationStatus: row.tutors.verificationStatus,
        // WWCC data — admin-only sensitive fields
        wwccNumber: row.tutors.wwccNumber,
        wwccExpiry: row.tutors.wwccExpiry,
        educationDetails: row.tutors.educationDetails,
        abn: row.tutors.abn ?? null,
        // Audit trail
        wwccVerifiedBy: row.tutors.wwccVerifiedBy ?? null,
        wwccVerifiedByName: verifiedByName,
        wwccVerifiedAt: row.tutors.wwccVerifiedAt?.toISOString() ?? null,
        wwccVerificationMethod: row.tutors.wwccVerificationMethod ?? null,
        wwccVerificationNotes: row.tutors.wwccVerificationNotes ?? null,
        createdAt: row.tutors.createdAt.toISOString(),
        documents: docs.map((d) => ({
          id: d.id,
          docType: d.docType,
          originalName: d.originalName,
          uploadedAt: d.uploadedAt.toISOString(),
        })),
      };
    })
  );

  res.json(withDocs);
});

// POST /api/admin/tutors/:tutorId/verify  — approve or reject with notes + audit trail
router.post("/admin/tutors/:tutorId/verify", requireAdmin, async (req, res) => {
  const tutorId = parseInt(req.params["tutorId"] as string, 10);
  const { action, notes, method } = req.body as {
    action: "approve" | "reject";
    notes?: string;
    method?: string;
  };

  if (!["approve", "reject"].includes(action)) {
    res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    return;
  }

  // Get admin user ID from token
  const authHeader = req.headers.authorization;
  let adminUserId: number | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = Buffer.from(authHeader.slice(7), "base64").toString("utf-8");
      adminUserId = parseInt(decoded.split(":")[0], 10) || null;
    } catch { /* noop */ }
  }

  const verificationStatus = action === "approve" ? "verified" : "rejected";
  const isApproved = action === "approve";

  await db
    .update(tutorsTable)
    .set({
      verificationStatus,
      isApproved,
      wwccVerifiedBy: adminUserId,
      wwccVerifiedAt: new Date(),
      wwccVerificationMethod: method ?? "manual_review",
      wwccVerificationNotes: notes ?? null,
    })
    .where(eq(tutorsTable.id, tutorId));

  res.json({ success: true, verificationStatus });
});

// POST /api/admin/tutors/:tutorId/approve  — legacy endpoint (kept for backward compat)
router.post("/admin/tutors/:tutorId/approve", requireAdmin, async (req, res) => {
  const tutorId = parseInt(req.params["tutorId"] as string, 10);
  const { approved } = req.body as { approved: boolean };

  await db
    .update(tutorsTable)
    .set({
      isApproved: approved,
      verificationStatus: approved ? "verified" : "rejected",
    })
    .where(eq(tutorsTable.id, tutorId));

  res.json({ success: true });
});

// GET /api/admin/documents/:docId  — download document (admin only)
router.get("/admin/documents/:docId", requireAdmin, async (req, res) => {
  const docId = parseInt(req.params["docId"] as string, 10);

  const [doc] = await db
    .select()
    .from(tutorDocumentsTable)
    .where(eq(tutorDocumentsTable.id, docId))
    .limit(1);

  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  const filePath = path.resolve(uploadsDir, doc.filePath);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found on disk" });
    return;
  }

  res.download(filePath, doc.originalName);
});

export default router;
