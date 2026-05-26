const redis = require('../config/redis');

const getOrSetCache = async (key, callback, ttl = 300) => {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const fresh = await callback();
  await redis.setex(key, ttl, JSON.stringify(fresh));
  return fresh;
};

const invalidatePattern = async (pattern) => {
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(keys);
};

module.exports = { getOrSetCache, invalidatePattern };