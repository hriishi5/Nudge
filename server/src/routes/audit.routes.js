import { Router } from 'express';
import { listAuditLog } from '../controllers/audit.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

router.get('/', listAuditLog);

export default router;
