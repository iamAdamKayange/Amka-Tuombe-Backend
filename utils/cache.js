const redis = require('../config/redis');

const getCachedOrFetch = async (key, fetchFn, ttl = 300) => {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const fresh = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(fresh));
  return fresh;
};

const invalidatePattern = async (pattern) => {
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(keys);
};

module.exports = { getCachedOrFetch, invalidatePattern };