const AudioSermon = require('../models/AudioSermon');
const Notification = require('../models/Notification');
const { deleteFile, extractCloudinaryPublicId } = require('../services/cloudinaryService');
const { uploadAudio, uploadImage, deleteObject, extractR2Key } = require('../services/r2Service');
const { emitMediaChanged, emitNotificationChanged } = require('../services/realtimeService');

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
    const audioFile = req.file || req.files?.audio?.[0];
    const coverFile = req.files?.cover?.[0] || null;

    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file required' });
    }

    if (!req.body.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!req.body.authorName) {
      return res.status(400).json({ error: 'Author name is required' });
    }

    console.log('Uploading audio to Cloudflare R2...');

    const result = await uploadAudio(audioFile.path, {
      title: req.body.title.trim(),
      originalName: audioFile.originalname,
      contentType: audioFile.mimetype,
    });
    const coverResult = coverFile
      ? await uploadImage(coverFile.path, {
          title: `${req.body.title.trim()} cover`,
          originalName: coverFile.originalname,
          contentType: coverFile.mimetype,
        })
      : null;
    const audioUrl =
      `${req.protocol}://${req.get('host')}/api/media/r2/${encodeURI(result.key)}`;
    const coverUrl = coverResult
      ? `${req.protocol}://${req.get('host')}/api/media/r2/${encodeURI(coverResult.key)}`
      : null;

    const audioData = {
      title: req.body.title.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      audioUrl,
      duration: req.body.duration || '',
      thumbnail: coverUrl || req.body.thumbnail || null,
      createdBy: req.user.id,
      cloudinaryPublicId: result.key,
    };

    const audio = await AudioSermon.create(audioData);
    const notification = await Notification.create({
      type: 'audio',
      title: 'Audio mpya imewekwa',
      body: audio.title,
      url: audio.audio_url,
      mediaId: audio.id,
      dedupeKey: `audio:${audio.id}`,
    }).catch((error) => console.error('Create audio notification error:', error.message));

    if (notification) emitNotificationChanged('created', notification);
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

    const r2Key = extractR2Key(audio.cloudinary_public_id) || extractR2Key(audio.audio_url);
    if (r2Key) {
      await deleteObject(r2Key);
    } else {
      const publicId = audio.cloudinary_public_id || extractCloudinaryPublicId(audio.audio_url);
      if (publicId) await deleteFile(publicId);
    }

    const coverR2Key = extractR2Key(audio.thumbnail);
    if (coverR2Key) {
      await deleteObject(coverR2Key);
    } else {
      const coverPublicId = extractCloudinaryPublicId(audio.thumbnail);
      if (coverPublicId) await deleteFile(coverPublicId, 'image');
    }

    emitMediaChanged('deleted', 'audio', { id: audio.id });
    return res.json({ message: 'Audio deleted', id: audio.id });
  } catch (err) {
    console.error('Delete audio error:', err);
    return res.status(500).json({ error: 'Failed to delete audio' });
  }
};
