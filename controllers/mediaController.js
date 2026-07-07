const { getObjectStream } = require('../services/r2Service');

exports.streamR2Object = async (req, res) => {
  try {
    const key = req.params[0];
    if (!key) return res.status(404).json({ error: 'Media not found' });

    const result = await getObjectStream(key, req.headers.range);
    const status = result.ContentRange ? 206 : 200;

    if (result.ContentType) res.setHeader('Content-Type', result.ContentType);
    if (result.ContentLength) res.setHeader('Content-Length', result.ContentLength);
    if (result.ContentRange) res.setHeader('Content-Range', result.ContentRange);
    res.setHeader('Accept-Ranges', result.AcceptRanges || 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    res.status(status);
    return result.Body.pipe(res);
  } catch (error) {
    const status = error.name === 'NoSuchKey' ? 404 : 500;
    console.error('R2 stream error:', error.message);
    return res.status(status).json({ error: 'Media haijapatikana' });
  }
};
