// controllers/audioController.js
const AudioSermon = require('../models/AudioSermon');
const { uploadVideoFromPath } = require('../services/cloudflareService');
const fs = require('fs').promises;
const { validateAudio } = require('../middleware/validate');

exports.getAllAudio = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const audio = await AudioSermon.findAll(limit, offset);
    res.json(audio);
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.createAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file required' });
    }
    if (!req.body.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Upload to Cloudflare Stream
    const result = await uploadVideoFromPath(req.file.path, req.body.title);

    // Delete local file
    await fs.unlink(req.file.path).catch(() => {});

    const audioData = {
      title: req.body.title.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      audioUrl: result.videoUrl,
      duration: req.body.duration || `${Math.floor(result.duration/60)}:${result.duration%60}`,
      thumbnail: result.thumbnail || req.body.thumbnail || null,
      createdBy: req.user.id,
    };

    const audio = await AudioSermon.create(audioData);
    return res.status(201).json(audio);
  } catch (err) {
    console.error('Error in createAudio:', err);
    res.status(500).json({ error: err.message });
  }
};