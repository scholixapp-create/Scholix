import { Router } from "express";
import { db, tutorArticlesTable, legalAgreementsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/authMiddleware";

const router = Router();

router.get("/academy", requireAuth, async (_req, res) => {
  const articles = await db
    .select()
    .from(tutorArticlesTable)
    .where(eq(tutorArticlesTable.isPublished, true))
    .orderBy(desc(tutorArticlesTable.createdAt));
  res.json(articles);
});

router.get("/academy/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  const [article] = await db
    .select()
    .from(tutorArticlesTable)
    .where(and(eq(tutorArticlesTable.id, id), eq(tutorArticlesTable.isPublished, true)))
    .limit(1);
  if (!article) { res.status(404).json({ error: "Article not found" }); return; }
  res.json(article);
});

router.get("/admin/academy", requireAdmin, async (_req, res) => {
  const articles = await db
    .select()
    .from(tutorArticlesTable)
    .orderBy(desc(tutorArticlesTable.createdAt));
  res.json(articles);
});

router.post("/admin/academy", requireAdmin, async (req, res) => {
  const userId = (req as AuthRequest).user.id;

  const { title, category, summary, content, type, videoUrl, isPublished } = req.body as Record<string, unknown>;
  if (!title || !category || !summary || !content) {
    res.status(400).json({ error: "title, category, summary and content are required" });
    return;
  }

  const slug = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80);

  const [article] = await db
    .insert(tutorArticlesTable)
    .values({
      title: String(title),
      slug: `${slug}-${Date.now()}`,
      category: String(category),
      summary: String(summary),
      content: String(content),
      type: String(type ?? "article"),
      videoUrl: videoUrl ? String(videoUrl) : null,
      isPublished: Boolean(isPublished ?? false),
      authorId: userId,
    })
    .returning();

  res.status(201).json(article);
});

router.put("/admin/academy/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  const { title, category, summary, content, type, videoUrl, isPublished } = req.body as Record<string, unknown>;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = String(title);
  if (category !== undefined) updates.category = String(category);
  if (summary !== undefined) updates.summary = String(summary);
  if (content !== undefined) updates.content = String(content);
  if (type !== undefined) updates.type = String(type);
  if (videoUrl !== undefined) updates.videoUrl = videoUrl ? String(videoUrl) : null;
  if (isPublished !== undefined) updates.isPublished = Boolean(isPublished);

  const [updated] = await db
    .update(tutorArticlesTable)
    .set(updates)
    .where(eq(tutorArticlesTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Article not found" }); return; }
  res.json(updated);
});

router.delete("/admin/academy/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(tutorArticlesTable).where(eq(tutorArticlesTable.id, id));
  res.json({ ok: true });
});

router.post("/agreements/accept", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const { agreementType, agreementVersion } = req.body as { agreementType?: string; agreementVersion?: string };
  if (!agreementType) { res.status(400).json({ error: "agreementType required" }); return; }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null;
  await db.insert(legalAgreementsTable).values({
    userId,
    agreementType,
    agreementVersion: agreementVersion ?? "2.0",
    ipAddress: ip,
  });
  res.json({ ok: true });
});

export default router;
