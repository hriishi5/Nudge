import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { RegisterRequestSchema, LoginRequestSchema } from '../schemas/index.js';

const router = Router();

router.post('/register', validateBody(RegisterRequestSchema), register);
router.post('/login', validateBody(LoginRequestSchema), login);
router.get('/me', requireAuth, getMe);

export default router;
