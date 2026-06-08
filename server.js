require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const pool = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/api/', apiLimiter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test database
pool.query('SELECT NOW()', (err, result) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Database connected:', result.rows[0].now);
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/teachings', require('./routes/teachingRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/live', require('./routes/liveRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/audio', require('./routes/audioRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'AmkaTuombe API running', status: 'OK' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});