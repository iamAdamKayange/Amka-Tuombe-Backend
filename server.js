require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try later.' }
});
app.use('/api/', limiter);

// Database test
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Database connected:', res.rows[0].now);
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/teachings', require('./routes/teachingRoutes'));
app.use('/api/live', require('./routes/liveRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'AmkaTuombe API running', status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});