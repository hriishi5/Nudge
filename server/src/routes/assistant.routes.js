import { Router } from 'express';
import { askAssistant } from '../controllers/assistant.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { aiRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { AssistantQueryRequestSchema } from '../schemas/index.js';

const router = Router();
router.use(requireAuth);

router.post('/query', aiRateLimiter, validateBody(AssistantQueryRequestSchema), askAssistant);

export default router;
