const Teaching = require('../models/Teaching');
const { uploadVideoFromPath } = require('../services/cloudflareService');
const fs = require('fs').promises;

exports.uploadVideoFile = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin only',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No video file uploaded',
      });
    }

    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        error: 'Title and description required',
      });
    }

    // Save pending teaching
    const teaching = await Teaching.createPending({
      title: title.trim(),
      description: description.trim(),
      createdBy: req.user.id,
    });

    console.log('📤 Uploading video to Cloudflare Stream...');

    const result = await uploadVideoFromPath(
      req.file.path,
      title.trim(),
    );

    // Delete local uploaded file
    await fs.unlink(req.file.path).catch(() => {});

    // Update teaching after upload success
    await Teaching.markCompleted(
      teaching.id,
      result.videoUrl,
      result.thumbnail,
      result.duration,
    );

    return res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      teachingId: teaching.id,
      videoUrl: result.videoUrl,
      thumbnail: result.thumbnail,
      duration: result.duration,
    });
  } catch (err) {
    console.error('VIDEO UPLOAD ERROR:', err);

    return res.status(500).json({
      error: err.message,
    });
  }
};