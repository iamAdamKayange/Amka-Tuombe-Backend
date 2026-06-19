// controllers/videoUploadController.js
const Teaching = require('../models/Teaching');
const { uploadVideoFromPath } = require('../services/cloudflareService');
const fs = require('fs').promises;

exports.uploadVideoFile = async (req, res) => {
  try {
    // ✅ LOGGING - Angalia user
    console.log('========================================');
    console.log('📤 UPLOAD VIDEO FILE CALLED');
    console.log('👤 req.user:', req.user);
    console.log('👤 req.user.role:', req.user?.role);
    console.log('👤 req.user.id:', req.user?.id);
    console.log('========================================');

    // ✅ Check if user exists first
    if (!req.user) {
      console.log('❌ No user object found');
      return res.status(401).json({
        error: 'Not authenticated. Please login again.',
      });
    }

    if (req.user.role !== 'admin') {
      console.log(`❌ User role is "${req.user.role}", not "admin"`);
      return res.status(403).json({
        error: `Admin only. Your role: ${req.user.role}`,
      });
    }

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        error: 'No video file uploaded',
      });
    }

    const { title, description } = req.body;
    console.log('📝 Title:', title);
    console.log('📝 Description:', description);
    console.log('📁 File:', req.file.originalname);
    console.log('📏 Size:', req.file.size);

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
    console.log('✅ Teaching created with ID:', teaching.id);

    console.log('📤 Uploading video to Cloudflare Stream...');

    const result = await uploadVideoFromPath(
      req.file.path,
      title.trim(),
    );

    console.log('✅ Cloudflare upload successful');
    console.log('📥 Video URL:', result.videoUrl);
    console.log('📥 Thumbnail:', result.thumbnail);

    // Delete local uploaded file
    await fs.unlink(req.file.path).catch(() => {
      console.log('⚠️ Could not delete local file');
    });

    // Update teaching after upload success
    await Teaching.markCompleted(
      teaching.id,
      result.videoUrl,
      result.thumbnail,
      result.duration,
    );
    console.log('✅ Teaching marked as completed');

    return res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      teachingId: teaching.id,
      videoUrl: result.videoUrl,
      thumbnail: result.thumbnail,
      duration: result.duration,
    });
  } catch (err) {
    console.error('❌ VIDEO UPLOAD ERROR:', err);
    console.error('❌ Stack:', err.stack);

    return res.status(500).json({
      error: err.message || 'Internal server error',
    });
  }
};