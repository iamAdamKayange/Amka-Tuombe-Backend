const Notification = require('../models/Notification');
const PushDeviceToken = require('../models/PushDeviceToken');

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
    const device = await PushDeviceToken.upsert({
      token,
      platform,
      userId: null,
    });

    return res.status(201).json({ ok: true, id: device.id });
  } catch (err) {
    console.error('Register device token error:', err);
    return res.status(500).json({ error: 'Failed to register device token' });
  }
};
