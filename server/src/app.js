// ====================================================================
// Nudge: Express Application Setup & Security Hardening
// ====================================================================

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

import { generalRateLimiter } from './middleware/rateLimit.middleware.js';
import authRoutes from './routes/auth.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import alertRoutes from './routes/alert.routes.js';
import jobRoutes from './routes/job.routes.js';
import assistantRoutes from './routes/assistant.routes.js';
import reportRoutes from './routes/report.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import auditRoutes from './routes/audit.routes.js';

dotenv.config();

const app = express();

// Security: HTTP headers protection
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Security: Permissive for local development, flexible and secure for production
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];

const allowedOrigins = [...new Set([...configuredOrigins, ...defaultOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    const normalized = origin.trim().replace(/\/+$/, '');
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(normalized);
    const isRenderDomain = normalized.endsWith('.onrender.com');
    const isVercelDomain = normalized.endsWith('.vercel.app');
    const isWildcard = process.env.CORS_ORIGIN === '*';

    if (
      isLocalhost ||
      isRenderDomain ||
      isVercelDomain ||
      isWildcard ||
      allowedOrigins.includes(normalized) ||
      process.env.NODE_ENV !== 'production'
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Secret-Token', 'X-Webhook-Secret']
}));

// Body parsers with reasonable size limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// General Rate Limiting
app.use('/api/', generalRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'nudge-compliance-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/reports', reportRoutes);
app.use('/reports', reportRoutes); // Alias for requests without /api prefix
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-log', auditRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Prevent logging PII or sensitive invoice tokens to console
  console.error('[API_ERROR]', {
    message: err.message,
    name: err.name,
    path: req.path,
    method: req.method
  });

  const statusCode = err.status || (err.name === 'UnauthorizedError' ? 401 : 500);
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected compliance service error occurred.' 
      : err.message
  });
});

export default app;
