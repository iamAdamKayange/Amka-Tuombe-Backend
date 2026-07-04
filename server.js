require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || !isProduction || allowedOrigins.length === 0) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: process.env.JSON_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/api/', apiLimiter);

app.get('/', (req, res) => {
  res.json({
    message: 'AmkaTuombe API running',
    status: 'ok',
    year: 2026,
  });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/teachings', require('./routes/teachingRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/live', require('./routes/liveRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/audio', require('./routes/audioRoutes'));

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  const message =
    isProduction && status >= 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  console.error('Unhandled error:', {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
  });

  return res.status(status).json({ error: message });
});

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
