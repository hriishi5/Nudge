import { Router } from 'express';
import { getForm3CDReport } from '../controllers/report.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

router.get('/form-3cd', getForm3CDReport);

export default router;
