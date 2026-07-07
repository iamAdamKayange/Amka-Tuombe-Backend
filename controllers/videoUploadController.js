exports.uploadVideoFile = async (req, res) => {
  return res.status(410).json({
    error:
      'Video upload ya zamani imezimwa. Tumia /api/upload/signature kupata Cloudflare Stream TUS upload URL.',
    provider: 'cloudflare_stream',
    uploadSignatureEndpoint: '/api/upload/signature?type=video',
  });
};
