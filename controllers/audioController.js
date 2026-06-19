// controllers/audioController.js
const AudioSermon = require('../models/AudioSermon');
const { uploadAudio } = require('../services/cloudinaryService');

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

    if (!req.body.authorName) {
      return res.status(400).json({ error: 'Author name is required' });
    }

    console.log('🎵 Uploading audio to Cloudinary directly...');

    // ✅ Direct upload to Cloudinary (NO QUEUE)
    const result = await uploadAudio(
      req.file.path,
      req.body.title.trim(),
      'amka_tuombe_audio'
    );

    console.log('✅ Audio upload successful');
    console.log('📥 Audio URL:', result.url);
    console.log('📥 Duration:', result.duration);

    // ✅ Create audio directly (NO PENDING)
    const audioData = {
      title: req.body.title.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      audioUrl: result.url,
      duration: req.body.duration || `${Math.floor(result.duration/60)}:${result.duration%60}`,
      thumbnail: req.body.thumbnail || null,
      createdBy: req.user.id,
    };

    const audio = await AudioSermon.create(audioData);
    return res.status(201).json(audio);
  } catch (err) {
    console.error('Error in createAudio:', err);
    res.status(500).json({ error: err.message });
  }
};