import { Router } from 'express';
import multer from 'multer';
import {
  listInvoices,
  uploadInvoice,
  extractInvoicePreview,
  getInvoice,
  updateInvoice,
  recomputeInvoice,
  deleteInvoice
} from '../controllers/invoice.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { aiRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { UpdateInvoiceSchema } from '../schemas/index.js';

const router = Router();

// Configure Multer for secure in-memory file handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, PNG, JPEG, and text files are supported.'), false);
    }
  }
});

router.use(requireAuth);

router.get('/', listInvoices);
router.post('/upload', aiRateLimiter, upload.single('file'), uploadInvoice);
router.post('/extract-preview', aiRateLimiter, upload.single('file'), extractInvoicePreview);
router.get('/:id', getInvoice);
router.patch('/:id', validateBody(UpdateInvoiceSchema), updateInvoice);
router.delete('/:id', deleteInvoice);
router.post('/:id/recompute', recomputeInvoice);

export default router;
