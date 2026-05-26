const cloudinary = require('../config/cloudinary');
const Teaching = require('../models/Teaching');
const { validateTeaching } = require('../middleware/validate');

// For direct video/thumbnail upload to Cloudinary (signed URL generation)
exports.getUploadSignature = async (req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'amka_tuombe' },
      process.env.CLOUDINARY_API_SECRET
    );
    res.json({ signature, timestamp, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Alternative: upload via backend (not recommended for large files)
exports.uploadTeaching = async (req, res) => {
  try {
    const { error } = validateTeaching(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const teaching = await Teaching.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(teaching);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};