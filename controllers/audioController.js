const AudioSermon = require('../models/AudioSermon');
const { uploadVideoFromPath } = require('../services/cloudflareService');
const fs = require('fs').promises;

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

    if (!audio) {
      return res.status(404).json({
        error: 'Audio not found',
      });
    }

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
      return res.status(400).json({
        error: 'Audio file required',
      });
    }

    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        error: 'Title and description required',
      });
    }

    console.log('🎵 Uploading audio to Cloudflare Stream...');

    const result = await uploadVideoFromPath(
      req.file.path,
      title.trim(),
    );

    // Delete local file
    await fs.unlink(req.file.path).catch(() => {});

    const audioData = {
      title: title.trim(),
      description: description.trim(),
      audioUrl: result.videoUrl,
      duration:
        result.duration > 0
          ? `${Math.floor(result.duration / 60)}:${String(
              result.duration % 60,
            ).padStart(2, '0')}`
          : '0:00',
      thumbnail: result.thumbnail,
      createdBy: req.user.id,
    };

    const audio = await AudioSermon.create(audioData);

    return res.status(201).json({
      success: true,
      message: 'Audio uploaded successfully',
      audio,
    });
  } catch (err) {
    console.error('AUDIO UPLOAD ERROR:', err);

    return res.status(500).json({
      error: err.message,
    });
  }
};