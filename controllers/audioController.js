const AudioSermon = require('../models/AudioSermon');
const { validateAudio } = require('../middleware/validate');
const cache = require('../config/redis');
const { getCachedOrFetch, invalidatePattern } = require('../utils/cache');

exports.getAllAudio = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const cacheKey = `audio:page:${page}:limit:${limit}`;
    const audio = await getCachedOrFetch(cacheKey, async () => {
      const offset = (page - 1) * limit;
      return await AudioSermon.findAll(limit, offset);
    }, 300);
    res.json(audio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAudioById = async (req, res) => {
  try {
    const audio = await AudioSermon.findById(req.params.id);
    if (!audio) return res.status(404).json({ error: 'Audio not found' });
    await AudioSermon.incrementPlays(req.params.id);
    res.json(audio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAudio = async (req, res) => {
  try {
    const { error } = validateAudio(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const audio = await AudioSermon.create({ ...req.body, createdBy: req.user.id });
    await invalidatePattern('audio:*');
    res.status(201).json(audio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};