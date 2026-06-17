// controllers/uploadController.js
const { getStreamDirectUpload } = require('../services/cloudflareService');

exports.getUploadSignature = async (req, res) => {
  try {
    const { type = 'video', title } = req.query;

    if (type === 'image') {
      // Kwa picha, unaweza kutumia R2 au Cloudflare Images
      // Hapa nitatoa tu mfano wa video
      return res.status(400).json({ error: 'Image upload not implemented yet' });
    }

    // Video au Audio
    const data = await getStreamDirectUpload({ 
      title: title || 'upload',
      maxDuration: 3600, // Dakika 60
    });

    res.json({
      uploadURL: data.uploadURL,
      uid: data.uid,
      type: 'video',
    });
  } catch (err) {
    console.error('Direct upload error:', err);
    res.status(500).json({ error: err.message });
  }
};