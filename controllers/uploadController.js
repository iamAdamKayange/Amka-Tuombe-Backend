const cloudinary = require('../config/cloudinary');

exports.getUploadSignature = async (req, res) => {
  try {
    const supportedTypes = new Set(['video', 'audio', 'image']);
    const type = supportedTypes.has(req.query.type) ? req.query.type : 'video';
    const title = (req.query.title || 'amka_tuombe_upload')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);

    const timestamp = Math.round(Date.now() / 1000);
    const folder = type === 'audio'
      ? 'amka_tuombe_audio'
      : type === 'image'
        ? 'amka_tuombe_audio_covers'
        : 'amka_tuombe_videos';
    const publicId = `${Date.now()}_${title || type}`;

    const videoTransformations = {
      original: 'c_limit,w_1920,h_1080,q_auto:good',
      landscape: 'c_fill,g_auto,w_1280,h_720,q_auto:good',
      portrait: 'c_fill,g_auto,w_720,h_1280,q_auto:good',
      square: 'c_fill,g_auto,w_1080,h_1080,q_auto:good',
      four_five: 'c_fill,g_auto,w_1080,h_1350,q_auto:good',
    };
    const cropPreset = Object.hasOwn(videoTransformations, req.query.crop)
      ? req.query.crop
      : 'original';
    const transformation = type === 'video'
      ? videoTransformations[cropPreset]
      : undefined;

    const params = {
      timestamp,
      folder,
      public_id: publicId,
      ...(transformation ? { transformation } : {}),
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
      cropPreset,
      transformation,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${type === 'image' ? 'image' : 'video'}/upload`,
    });
  } catch (err) {
    console.error('Cloudinary signature error:', err);
    res.status(500).json({ error: err.message });
  }
};
