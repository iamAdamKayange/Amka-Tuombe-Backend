require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors());

// Increase JSON payload limit (for metadata, not for file uploads)
app.use(express.json({ limit: '50mb' }));

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try later.' }
});
app.use('/api/', limiter);

// Serve static files from uploads folder (for local dev, optional)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database test
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Database connected:', res.rows[0].now);
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/teachings', require('./routes/teachingRoutes'));   // public + user
app.use('/api/admin', require('./routes/adminRoutes'));          // admin only
app.use('/api/live', require('./routes/liveRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/audio', require('./routes/audioRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'AmkaTuombe API running', status: 'OK' });
});

// Global error handler (catch-all)
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});