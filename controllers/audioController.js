const AudioSermon = require('../models/AudioSermon');
const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;
const { validateAudio } = require('../middleware/validate');

// Helper: upload to Cloudinary
async function uploadToCloudinary(localPath) {
  const result = await cloudinary.uploader.upload(localPath, {
    resource_type: 'video', // 'video' also works for audio
    folder: 'amka_tuombe_audio',
  });
  return result;
}

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

// This handles both file upload (multipart) and JSON (optional)
exports.createAudio = async (req, res) => {
  try {
    // Case 1: File upload (multipart)
    if (req.file) {
      // Validate required fields
      if (!req.body.title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (!req.body.authorName) {
        return res.status(400).json({ error: 'Author name is required' });
      }

      // Upload file to Cloudinary
      let audioUrl, duration, thumbnail;
      try {
        const result = await uploadToCloudinary(req.file.path);
        audioUrl = result.secure_url;
        duration = Math.round(result.duration) || null;
        thumbnail = result.thumbnail_url || null;
        // Delete local file after upload
        await fs.unlink(req.file.path).catch(() => {});
      } catch (uploadErr) {
        console.error('Cloudinary upload error:', uploadErr);
        return res.status(500).json({ error: 'Failed to upload audio file' });
      }

      const audioData = {
        title: req.body.title.trim(),
        description: req.body.description ? req.body.description.trim() : '',
        audioUrl: audioUrl,
        duration: req.body.duration || (duration ? `${Math.floor(duration/60)}:${duration%60}` : null),
        thumbnail: thumbnail || req.body.thumbnail || null,
        createdBy: req.user.id,
      };

      const audio = await AudioSermon.create(audioData);
      return res.status(201).json(audio);
    } 
    // Case 2: JSON body (if you keep the other endpoint)
    else {
      const { error } = validateAudio(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });
      const audio = await AudioSermon.create({ ...req.body, createdBy: req.user.id });
      return res.status(201).json(audio);
    }
  } catch (err) {
    console.error('Error in createAudio:', err);
    res.status(500).json({ error: err.message });
  }
};