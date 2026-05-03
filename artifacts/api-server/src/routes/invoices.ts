import { Router } from "express";
import PDFDocument from "pdfkit";
import { db, invoicesTable, sessionsTable, tutorsTable, studentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/invoices/:invoiceId/pdf", async (req, res) => {
  const invoiceId = parseInt(req.params.invoiceId, 10);
  if (isNaN(invoiceId)) {
    res.status(400).json({ error: "Invalid invoice ID" });
    return;
  }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId))
    .limit(1);

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, invoice.sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [tutorRow] = await db
    .select({
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
    })
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.id, session.tutorId))
    .limit(1);

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, session.studentId))
    .limit(1);

  let parentFirstName = "";
  let parentLastName = "";
  let parentEmail = "";

  if (student?.parentId) {
    const [parentRow] = await db
      .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, student.parentId))
      .limit(1);
    if (parentRow) {
      parentFirstName = parentRow.firstName;
      parentLastName = parentRow.lastName;
      parentEmail = parentRow.email;
    }
  }

  const tutorName = tutorRow ? `${tutorRow.firstName} ${tutorRow.lastName}` : "Tutor";
  const tutorEmail = tutorRow?.email ?? "";
  const studentName = student ? `${student.firstName} ${student.lastName}` : "Student";
  const parentName = parentFirstName ? `${parentFirstName} ${parentLastName}` : "Parent";
  const invoiceDate = invoice.generatedAt.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const sessionDate = session.scheduledAt.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const sessionTime = session.scheduledAt.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${invoice.id}.pdf"`,
  );
  doc.pipe(res);

  // ── Header bar ─────────────────────────────────────────────────────────
  const NAV = "#1e3a5f";
  const ACCENT = "#1d6f5a";
  const LIGHT_GRAY = "#f5f5f5";
  const MID_GRAY = "#9ca3af";
  const DARK = "#111827";

  doc.rect(0, 0, doc.page.width, 80).fill(NAV);

  doc.fontSize(22).fillColor("#ffffff").font("Helvetica-Bold")
    .text("SCHOLIX", 50, 25);
  doc.fontSize(9).fillColor("rgba(255,255,255,0.65)").font("Helvetica")
    .text("Tutoring Platform", 50, 50);

  doc.fontSize(20).fillColor("#ffffff").font("Helvetica-Bold")
    .text("INVOICE", 0, 30, { align: "right" });
  doc.fontSize(9).fillColor("rgba(255,255,255,0.65)").font("Helvetica")
    .text(`#${String(invoice.id).padStart(5, "0")}`, 0, 53, { align: "right" });

  // ── Invoice meta ────────────────────────────────────────────────────────
  let y = 105;
  doc.fontSize(8).fillColor(MID_GRAY).font("Helvetica")
    .text("DATE ISSUED", 50, y)
    .text("SESSION DATE", 200, y)
    .text("DURATION", 360, y)
    .text("STATUS", 460, y);

  y += 14;
  doc.fontSize(9).fillColor(DARK).font("Helvetica-Bold")
    .text(invoiceDate, 50, y)
    .text(sessionDate, 200, y)
    .text(`${session.durationMinutes} minutes`, 360, y)
    .text("PAID", 460, y, { width: 60 });

  // ── From / To ───────────────────────────────────────────────────────────
  y += 40;
  const BOX_H = 90;
  doc.rect(50, y, 230, BOX_H).fill(LIGHT_GRAY);
  doc.rect(310, y, 230, BOX_H).fill(LIGHT_GRAY);

  doc.fontSize(7).fillColor(MID_GRAY).font("Helvetica-Bold")
    .text("FROM (TUTOR)", 64, y + 12)
    .text("TO (PARENT / GUARDIAN)", 324, y + 12);

  doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold")
    .text(tutorName, 64, y + 26)
    .text(parentName, 324, y + 26);

  doc.fontSize(8.5).fillColor("#374151").font("Helvetica")
    .text(tutorEmail, 64, y + 42)
    .text(parentEmail, 324, y + 42);

  // ── Line items table ─────────────────────────────────────────────────────
  y += BOX_H + 30;
  doc.rect(50, y, doc.page.width - 100, 24).fill(NAV);

  doc.fontSize(8).fillColor("#ffffff").font("Helvetica-Bold")
    .text("DESCRIPTION", 64, y + 8)
    .text("STUDENT", 310, y + 8)
    .text("AMOUNT", 0, y + 8, { align: "right" });

  y += 24;
  doc.rect(50, y, doc.page.width - 100, 36).fill("#fafafa");
  doc.strokeColor("#e5e7eb").lineWidth(0.5)
    .moveTo(50, y + 36).lineTo(doc.page.width - 50, y + 36).stroke();

  doc.fontSize(9).fillColor(DARK).font("Helvetica-Bold")
    .text(session.subject, 64, y + 10);
  doc.fontSize(8).fillColor("#6b7280").font("Helvetica")
    .text(`${sessionDate} · ${sessionTime}`, 64, y + 23);

  doc.fontSize(9).fillColor(DARK).font("Helvetica")
    .text(studentName, 310, y + 13);

  doc.fontSize(11).fillColor(DARK).font("Helvetica-Bold")
    .text(`$${session.totalAmount.toFixed(2)}`, 0, y + 10, { align: "right" });

  // ── Total ────────────────────────────────────────────────────────────────
  y += 60;
  doc.rect(doc.page.width - 200, y, 150, 40).fill(NAV);
  doc.fontSize(8).fillColor("rgba(255,255,255,0.65)").font("Helvetica")
    .text("TOTAL DUE", doc.page.width - 192, y + 8);
  doc.fontSize(16).fillColor("#ffffff").font("Helvetica-Bold")
    .text(`$${session.totalAmount.toFixed(2)}`, doc.page.width - 192, y + 18);

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = doc.page.height - 60;
  doc.rect(0, footerY, doc.page.width, 60).fill(LIGHT_GRAY);
  doc.fontSize(8).fillColor(MID_GRAY).font("Helvetica")
    .text(
      "Thank you for using Scholix. Payment is processed through the platform.",
      50, footerY + 20, { align: "center", width: doc.page.width - 100 },
    )
    .text(
      `Invoice generated on ${invoiceDate} · scholix.app`,
      50, footerY + 35, { align: "center", width: doc.page.width - 100 },
    );

  // Optional: note bar in accent colour for paid status
  doc.rect(50, footerY - 20, doc.page.width - 100, 16).fill(ACCENT);
  doc.fontSize(7.5).fillColor("#ffffff").font("Helvetica-Bold")
    .text("PAYMENT RECEIVED — THANK YOU", 0, footerY - 14, { align: "center" });

  doc.end();
});

export default router;
