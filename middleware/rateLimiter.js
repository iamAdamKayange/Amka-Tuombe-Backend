const rateLimit = require('express-rate-limit');

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try after 15 minutes' }
});

module.exports = { authLimiter };