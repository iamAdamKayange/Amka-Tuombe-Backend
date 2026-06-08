const cloudinary = require('../config/cloudinary');

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