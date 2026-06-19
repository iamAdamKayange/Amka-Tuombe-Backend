const getOrSetCache = async (key, callback, ttl = 300) => {
  return await callback();
};

const invalidatePattern = async (pattern) => {
  return true;
};

module.exports = {
  getOrSetCache,
  invalidatePattern,
};