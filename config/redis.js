const Redis = require('ioredis');

let redisClient = null;
let isRedisReady = false;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });

    redisClient.on('connect', () => {
      isRedisReady = true;
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      if (!isRedisReady) {
        console.warn('⚠️ Redis not available, caching disabled');
        isRedisReady = false;
      }
    });
  } catch (err) {
    console.warn('⚠️ Redis initialization failed, caching disabled');
  }
} else {
  console.log('ℹ️ REDIS_URL not set, running without cache');
}

// Dummy client when Redis is not available
const dummy = {
  get: async () => null,
  setex: async () => {},
  del: async () => {},
  keys: async () => [],
};

module.exports = redisClient && isRedisReady ? redisClient : dummy;