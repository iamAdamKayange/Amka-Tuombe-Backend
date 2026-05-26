const Redis = require('ioredis');

let redis = null;
let redisEnabled = false;

// Only try to connect if REDIS_URL is set and not the default localhost (unless you really have Redis)
if (process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379') {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts to avoid spam
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      }
    });

    redis.on('connect', () => {
      redisEnabled = true;
      console.log('✅ Redis connected');
    });

    redis.on('error', (err) => {
      if (!redisEnabled) {
        // Silently ignore initial connection errors
        console.warn('⚠️ Redis not available, caching disabled');
        redisEnabled = false;
      }
    });
  } catch (err) {
    console.warn('⚠️ Redis initialization failed, caching disabled');
    redis = null;
  }
} else {
  console.log('ℹ️ Redis not configured, running without cache');
}

// Create a dummy client for when Redis is not available
const dummyRedis = {
  get: async () => null,
  setex: async () => {},
  del: async () => {},
  keys: async () => [],
  on: () => {}
};

// Export the real redis if connected and enabled, otherwise dummy
module.exports = redis && redisEnabled ? redis : dummyRedis;