import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tutorsRouter from "./tutors";
import studentsRouter from "./students";
import sessionsRouter from "./sessions";
import paymentsRouter from "./payments";
import adminRouter from "./admin";
import notificationsRouter from "./notifications";
import invoicesRouter from "./invoices";
import verificationRouter from "./verification";
import progressRouter from "./progress";
import settingsRouter from "./settings";
import reviewsRouter from "./reviews";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(verificationRouter);
router.use(tutorsRouter);
router.use(studentsRouter);
router.use(sessionsRouter);
router.use(progressRouter);
router.use(paymentsRouter);
router.use(adminRouter);
router.use(notificationsRouter);
router.use(invoicesRouter);
router.use(settingsRouter);
router.use(reviewsRouter);
router.use(reportsRouter);

export default router;
