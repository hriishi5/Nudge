import { Router } from 'express';
import { listAlerts, acknowledgeAlert } from '../controllers/alert.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

router.get('/', listAlerts);
router.post('/:id/acknowledge', acknowledgeAlert);

export default router;
