const LiveSession = require('../models/LiveSession');
const youtubeService = require('../services/youtubeService');

exports.getCurrentLive = async (req, res) => {
  try {
    const youtubeLive = await youtubeService.getCurrentLive();
    if (youtubeLive) {
      return res.json({
        isActive: true,
        source: 'youtube',
        audioStreamUrl: process.env.LIVE_AUDIO_STREAM_URL || null,
        live: youtubeLive,
      });
    }

    const live = await LiveSession.getActive();
    if (!live) return res.json({ isActive: false });
    return res.json({
      isActive: true,
      source: 'manual',
      audioStreamUrl: process.env.LIVE_AUDIO_STREAM_URL || null,
      live,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.startLive = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { title, streamUrl } = req.body;
    const session = await LiveSession.create({ title, streamUrl });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.endLive = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const active = await LiveSession.getActive();
    if (!active) return res.status(404).json({ error: 'No active live session' });
    const ended = await LiveSession.endSession(active.id);
    res.json(ended);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
