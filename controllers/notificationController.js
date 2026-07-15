const Notification = require('../models/Notification');
const PushDeviceToken = require('../models/PushDeviceToken');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function optionalUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.slice('Bearer '.length).trim();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [decoded.userId],
    );
    return rows[0] || null;
  } catch (_) {
    return null;
  }
}

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findRecent({
      since: req.query.since || null,
      limit: req.query.limit,
    });
    return res.json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ error: 'Failed to load notifications' });
  }
};

exports.registerDeviceToken = async (req, res) => {
  try {
    const token = req.body.token?.trim();
    if (!token) return res.status(400).json({ error: 'Device token required' });

    const platform = req.body.platform?.trim() || null;
    const installCutoffAt = req.body.installCutoffAt || null;
    const user = await optionalUser(req);
    const device = await PushDeviceToken.upsert({
      token,
      platform,
      installCutoffAt,
      userId: user?.id || null,
    });

    return res.status(201).json({ ok: true, id: device.id });
  } catch (err) {
    console.error('Register device token error:', err);
    return res.status(500).json({ error: 'Failed to register device token' });
  }
};
