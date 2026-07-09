require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const pool = require('./config/db');
const migrate = require('./db/migrate');
const { apiLimiter } = require('./middleware/rateLimiter');
const { initRealtime } = require('./services/realtimeService');
const { startLiveMonitor, stopLiveMonitor } = require('./services/liveMonitorService');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigin = (origin, callback) => {
  if (!origin || !isProduction || allowedOrigins.length === 0) {
    return callback(null, true);
  }

  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error('Origin not allowed by CORS'));
};

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
    origin: corsOrigin,
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
app.use('/api/media', require('./routes/mediaRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

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

let server;

async function start() {
  await migrate();
  server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });
  initRealtime(io);
  startLiveMonitor();

  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch(async (error) => {
  console.error('Server startup failed:', error);
  await pool.end().catch(() => {});
  process.exit(1);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  stopLiveMonitor();
  if (!server) {
    await pool.end();
    process.exit(0);
  }
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
