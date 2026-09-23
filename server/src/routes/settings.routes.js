import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { SettingsUpdateSchema } from '../schemas/index.js';

const router = Router();
router.use(requireAuth);

router.get('/', getSettings);
router.patch('/', requireAdmin, validateBody(SettingsUpdateSchema), updateSettings);

export default router;
