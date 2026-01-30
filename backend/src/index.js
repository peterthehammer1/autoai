import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    name: 'Premier Auto Service Booking API',
    version: '1.0.0',
    status: 'online',
    description: 'AI-powered voice booking system for automotive service centers',
    endpoints: {
      health: '/health',
      retell_functions: '/api/retell/*',
      dashboard_api: '/api/*'
    },
    documentation: 'https://github.com/peterthehammer1/autoai',
    powered_by: 'Retell AI + Supabase'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/customers', customerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/call-logs', callLogRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/sms-logs', smsLogRoutes);

// Retell Function Endpoints (simplified paths for function calling)
app.use('/api/retell', (await import('./routes/retell-functions.js')).default);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
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
