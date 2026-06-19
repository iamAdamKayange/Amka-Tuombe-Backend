// utils/cache.js

const getOrSetCache = async (key, callback) => {
  return await callback();
};

const getCachedOrFetch = async (key, callback) => {
  return await callback();
};

const invalidatePattern = async () => {
  return true;
};

module.exports = {
  getOrSetCache,
  getCachedOrFetch,
  invalidatePattern,
};