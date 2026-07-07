// controllers/audioController.js
const AudioSermon = require('../models/AudioSermon');
const Notification = require('../models/Notification');
const { uploadAudio } = require('../services/cloudinaryService');
const { deleteFile, extractCloudinaryPublicId } = require('../services/cloudinaryService');
const { emitMediaChanged } = require('../services/realtimeService');

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const twoDigits = (value) => value.toString().padStart(2, '0');

  return hours > 0
    ? `${hours}:${twoDigits(minutes)}:${twoDigits(remainder)}`
    : `${twoDigits(minutes)}:${twoDigits(remainder)}`;
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
      duration: formatDuration(result.duration),
      thumbnail: req.body.thumbnail || null,
      createdBy: req.user.id,
      cloudinaryPublicId: result.public_id,
    };

    const audio = await AudioSermon.create(audioData);
    await Notification.create({
      type: 'audio',
      title: 'Audio mpya imewekwa',
      body: audio.title,
      url: audio.audio_url,
      mediaId: audio.id,
      dedupeKey: `audio:${audio.id}`,
    }).catch((error) => console.error('Create audio notification error:', error.message));

    emitMediaChanged('created', 'audio', audio);
    return res.status(201).json(audio);
  } catch (err) {
    console.error('Error in createAudio:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateAudio = async (req, res) => {
  try {
    const current = await AudioSermon.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Audio not found' });

    const title = req.body.title?.trim();
    const description = req.body.description?.trim() ?? '';
    if (!title || title.length < 3 || title.length > 100) {
      return res.status(400).json({ error: 'Title must be 3 to 100 characters' });
    }
    if (description.length > 500) {
      return res.status(400).json({ error: 'Description cannot exceed 500 characters' });
    }

    const audio = await AudioSermon.update(req.params.id, {
      title,
      description,
      thumbnail: req.body.thumbnail ?? current.thumbnail,
      duration: req.body.duration ?? current.duration,
    });
    emitMediaChanged('updated', 'audio', audio);
    return res.json(audio);
  } catch (err) {
    console.error('Update audio error:', err);
    return res.status(500).json({ error: 'Failed to update audio' });
  }
};

exports.deleteAudio = async (req, res) => {
  try {
    const audio = await AudioSermon.deleteById(req.params.id);
    if (!audio) return res.status(404).json({ error: 'Audio not found' });

    const publicId = audio.cloudinary_public_id || extractCloudinaryPublicId(audio.audio_url);
    if (publicId) await deleteFile(publicId);
    const coverPublicId = extractCloudinaryPublicId(audio.thumbnail);
    if (coverPublicId) await deleteFile(coverPublicId, 'image');

    emitMediaChanged('deleted', 'audio', { id: audio.id });
    return res.json({ message: 'Audio deleted', id: audio.id });
  } catch (err) {
    console.error('Delete audio error:', err);
    return res.status(500).json({ error: 'Failed to delete audio' });
  }
};
