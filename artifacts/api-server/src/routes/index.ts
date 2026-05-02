import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tutorsRouter from "./tutors";
import studentsRouter from "./students";
import sessionsRouter from "./sessions";
import paymentsRouter from "./payments";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(tutorsRouter);
router.use(studentsRouter);
router.use(sessionsRouter);
router.use(paymentsRouter);
router.use(adminRouter);

export default router;
