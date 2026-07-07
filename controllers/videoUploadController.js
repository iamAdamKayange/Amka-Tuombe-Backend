// controllers/videoUploadController.js
const Teaching = require('../models/Teaching');
const { uploadVideo } = require('../services/cloudinaryService');
const { emitMediaChanged } = require('../services/realtimeService');

exports.uploadVideoFile = async (req, res) => {
  try {
    console.log('========================================');
    console.log('📤 UPLOAD VIDEO FILE CALLED');
    console.log('👤 req.user:', req.user);
    console.log('👤 req.user.role:', req.user?.role);
    console.log('👤 req.user.id:', req.user?.id);
    console.log('========================================');

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

    // ✅ Direct upload to Cloudinary (NO QUEUE)
    console.log('📤 Uploading video to Cloudinary directly...');

    const result = await uploadVideo(
      req.file.path,
      title.trim(),
      'amka_tuombe_videos'
    );

    console.log('✅ Cloudinary upload successful');
    console.log('📥 Video URL:', result.url);
    console.log('📥 Thumbnail:', result.thumbnail);
    console.log('📥 Duration:', result.duration);

    // ✅ Create teaching directly (NO PENDING)
    const teaching = await Teaching.create({
      title: title.trim(),
      description: description.trim(),
      url: result.url,
      thumbnail: result.thumbnail,
      duration: result.duration,
      createdBy: req.user.id,
    });

    console.log('✅ Teaching created with ID:', teaching.id);

    emitMediaChanged('created', 'video', teaching);

    return res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      teaching: teaching,
    });
  } catch (err) {
    console.error('❌ VIDEO UPLOAD ERROR:', err);
    console.error('❌ Stack:', err.stack);

    return res.status(500).json({
      error: err.message || 'Internal server error',
    });
  }
};
