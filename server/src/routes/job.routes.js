import { Router } from 'express';
import { scanDeadlines } from '../controllers/jobs.controller.js';
import { verifySecretHeader } from '../middleware/auth.middleware.js';

const router = Router();

// Scheduled daily deadline scanner: authenticated by signed secret header
router.post('/scan-deadlines', verifySecretHeader('SCHEDULED_JOB_SECRET'), scanDeadlines);

export default router;
