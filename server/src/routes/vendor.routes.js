import { Router } from 'express';
import multer from 'multer';
import {
  listVendors,
  createVendor,
  getVendor,
  uploadCertificate,
  requestDeclaration,
  approveDeclaration,
  handleInboundWebhook
} from '../controllers/vendor.controller.js';
import { requireAuth, verifySecretHeader } from '../middleware/auth.middleware.js';
import { aiRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  CreateVendorSchema,
  ApproveDeclarationSchema
} from '../schemas/index.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid certificate format. Only PDF, PNG, JPEG allowed.'), false);
  }
});

// Inbound email webhook: authenticated via signed secret (no user session)
router.post('/webhook/inbound', verifySecretHeader('INBOUND_WEBHOOK_SECRET'), handleInboundWebhook);

// User authenticated routes
router.use(requireAuth);

router.get('/', listVendors);
router.post('/', validateBody(CreateVendorSchema), createVendor);
router.get('/:id', getVendor);
router.post('/:id/upload-certificate', aiRateLimiter, upload.single('file'), uploadCertificate);
router.post('/:id/request-declaration', aiRateLimiter, requestDeclaration);
router.post('/:id/approve-declaration', validateBody(ApproveDeclarationSchema), approveDeclaration);

export default router;
