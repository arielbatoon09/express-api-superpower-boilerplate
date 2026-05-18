import express from 'express';
import authRouter from '@/routes/auth-routes';
import systemRouter from '@/routes/system-routes';

const router = express.Router();

// Mount System & Helper Routes (handles /api/csrf-token and /api/health)
router.use('/', systemRouter);

// Mount Feature Routers
router.use('/auth', authRouter);

export default router;
