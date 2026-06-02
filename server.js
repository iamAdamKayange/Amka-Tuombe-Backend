require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

/* ================================
   🔥 IMPORTANT FIX FOR RENDER
   ================================ */
app.set('trust proxy', 1); // 👈 ADD HII (MUHIMU SANA)

/* ================================
   SECURITY MIDDLEWARE
   ================================ */
app.use(helmet());
app.use(cors());

/* ================================
   BODY PARSER
   ================================ */
app.use(express.json({ limit: '50mb' }));

/* ================================
   RATE LIMIT (FIXED NOW)
   ================================ */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try later.' }
});

app.use('/api/', limiter);

/* ================================
   STATIC FILES
   ================================ */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ================================
   DB TEST
   ================================ */
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Database connected:', res.rows[0].now);
});

/* ================================
   ROUTES
   ================================ */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/teachings', require('./routes/teachingRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/live', require('./routes/liveRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/audio', require('./routes/audioRoutes'));

/* ================================
   HEALTH CHECK
   ================================ */
app.get('/', (req, res) => {
  res.json({ message: 'AmkaTuombe API running', status: 'OK' });
});

/* ================================
   GLOBAL ERROR HANDLER
   ================================ */
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ error: message });
});

/* ================================
   START SERVER
   ================================ */
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});