import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import customerRoutes from './routes/customers.js';
import serviceRoutes from './routes/services.js';
import appointmentRoutes from './routes/appointments.js';
import availabilityRoutes from './routes/availability.js';
import webhookRoutes from './routes/webhooks.js';
import analyticsRoutes from './routes/analytics.js';
import callLogRoutes from './routes/call-logs.js';
import reminderRoutes from './routes/reminders.js';
import smsLogRoutes from './routes/sms-logs.js';
import callCenterRoutes from './routes/call-center.js';
import cronRoutes from './routes/cron.js';
import createLeadsRouter from './routes/leads.js';
import { supabase } from './config/database.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,                  // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later' } }
});

const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,                  // 10 booking attempts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many booking attempts, please try again later' } }
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,                 // higher limit for voice webhooks (rapid-fire during calls)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Rate limit exceeded' } }
});

// Middleware
app.use(helmet());

// CORS — restrict to known origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API key authentication — protects dashboard endpoints
function requireApiKey(req, res, next) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return next(); // Skip if not configured (dev mode)
  const provided = req.headers['x-api-key'];
  if (provided === apiKey) return next();
  res.status(401).json({ error: { message: 'Unauthorized' } });
}

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    name: 'Premier Auto Service Booking API',
    version: '1.0.0',
    status: 'online',
    description: 'AI-powered voice booking system for automotive service centers',
    endpoints: {
      health: '/health',
      voice_functions: '/api/voice/*',
      dashboard_api: '/api/*'
    },
    documentation: 'https://github.com/peterthehammer1/autoai',
    powered_by: 'Nucleus AI + Supabase'
  });
});

// Health check — pings the database to verify connectivity
app.get('/health', async (req, res) => {
  const start = Date.now();
  try {
    const { count, error } = await supabase
      .from('service_bays')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      response_ms: Date.now() - start
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'unreachable',
      error: err.message,
      response_ms: Date.now() - start
    });
  }
});

// Dashboard API routes — require API key + rate limiting
app.use('/api/customers', generalLimiter, requireApiKey, customerRoutes);
app.use('/api/services', generalLimiter, requireApiKey, serviceRoutes);
app.use('/api/appointments', bookingLimiter, requireApiKey, appointmentRoutes);
app.use('/api/availability', generalLimiter, requireApiKey, availabilityRoutes);
app.use('/api/analytics', generalLimiter, requireApiKey, analyticsRoutes);
app.use('/api/call-logs', generalLimiter, requireApiKey, callLogRoutes);
app.use('/api/reminders', generalLimiter, requireApiKey, reminderRoutes);
app.use('/api/sms-logs', generalLimiter, requireApiKey, smsLogRoutes);
app.use('/api/call-center', generalLimiter, requireApiKey, callCenterRoutes);

// External service endpoints — no API key (authenticated by their own mechanisms)
app.use('/api/webhooks', webhookLimiter, webhookRoutes);
app.use('/api/voice', webhookLimiter, (await import('./routes/retell-functions.js')).default);
app.use('/api/cron', cronRoutes);

// Leads — POST is public (landing page form), GET requires API key
app.use('/api/leads', bookingLimiter, createLeadsRouter(requireApiKey));

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.error('Request error', {
    error: err,
    status,
    method: req.method,
    path: req.originalUrl
  });
  res.status(status).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found' } });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚗 Auto Service Booking API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

export default app;
