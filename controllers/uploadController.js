const axios = require('axios');
const { uploadImage } = require('../services/r2Service');

function cleanTitle(value) {
  return (value || 'amka_tuombe_upload')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

async function createCloudflareStreamUpload({ title, fileSize }) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Stream env hazijakamilika.');
  }

  const uploadLength = Number(fileSize);
  if (!Number.isFinite(uploadLength) || uploadLength <= 0) {
    throw new Error('Ukubwa wa video haujatumwa vizuri.');
  }

  const uploadName = Buffer.from(title || 'amka_tuombe_video').toString('base64');
  const response = await axios.post(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    null,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': uploadLength,
        'Upload-Metadata': `name ${uploadName}`,
      },
      maxBodyLength: Infinity,
      validateStatus: (status) => status >= 200 && status < 300,
    },
  );

  const uploadUrl = response.headers.location;
  const uid = response.headers['stream-media-id'] ||
    response.headers['stream-media-uid'];

  if (!uploadUrl || !uid) {
    throw new Error('Cloudflare haijarudisha upload URL au video ID.');
  }

  return {
    provider: 'cloudflare_stream',
    uploadProtocol: 'tus',
    uploadUrl,
    uid,
    playbackUrl: `https://videodelivery.net/${uid}/manifest/video.m3u8`,
    thumbnailUrl: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=2s`,
    expiresIn: Number(process.env.CF_UPLOAD_EXPIRY || 3600),
  };
}

exports.getUploadSignature = async (req, res) => {
  try {
    const supportedTypes = new Set(['video', 'audio', 'image']);
    const type = supportedTypes.has(req.query.type) ? req.query.type : 'video';
    const title = cleanTitle(req.query.title);

    if (type === 'video') {
      const upload = await createCloudflareStreamUpload({
        title,
        fileSize: req.query.fileSize,
      });
      return res.json(upload);
    }

    if (type === 'audio') {
      return res.json({
        provider: 'cloudflare_r2',
        uploadMode: 'backend_multipart',
        uploadUrl: `${req.protocol}://${req.get('host')}/api/audio/upload`,
      });
    }

    return res.json({
      provider: 'cloudflare_r2',
      uploadMode: 'backend_multipart',
      uploadUrl: `${req.protocol}://${req.get('host')}/api/upload/image`,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const cloudflareError =
      err.response?.data?.errors?.[0]?.message ||
      err.response?.data?.message ||
      err.response?.data?.error;
    const message = status === 413
      ? `Cloudflare Stream imekataa ukubwa wa video hii. Angalia Stream account limit au mpunguze/compress video. ${cloudflareError || ''}`.trim()
      : cloudflareError || err.message;

    console.error('Upload signature error:', {
      status,
      message,
      cloudflare: err.response?.data,
    });
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file required' });
    }

    const result = await uploadImage(req.file.path, {
      title: req.body.title || 'cover',
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
    });
    const url = `${req.protocol}://${req.get('host')}/api/media/r2/${encodeURI(result.key)}`;

    return res.status(201).json({
      provider: 'cloudflare_r2',
      secure_url: url,
      url,
      key: result.key,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error('R2 image upload error:', error);
    return res.status(500).json({ error: error.message });
  }
};
