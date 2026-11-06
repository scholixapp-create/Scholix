import { Router } from "express";
import { requireAdmin } from "../lib/authMiddleware";
import { listPendingUserRequests } from "../lib/adminRequests";

const router = Router();
router.get("/admin/user-requests", requireAdmin, async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await listPendingUserRequests());
});
export default router;
