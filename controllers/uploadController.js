const cloudinary = require('../config/cloudinary');

exports.getUploadSignature = async (req, res) => {
  try {
    const type = req.query.type === 'audio' ? 'audio' : 'video';
    const title = (req.query.title || 'amka_tuombe_upload')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);

    const timestamp = Math.round(Date.now() / 1000);
    const folder = type === 'audio' ? 'amka_tuombe_audio' : 'amka_tuombe_videos';
    const publicId = `${Date.now()}_${title || type}`;

    const params = {
      timestamp,
      folder,
      public_id: publicId,
    };

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET,
    );

    res.json({
      signature,
      timestamp,
      folder,
      publicId,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
    });
  } catch (err) {
    console.error('Cloudinary signature error:', err);
    res.status(500).json({ error: err.message });
  }
};
