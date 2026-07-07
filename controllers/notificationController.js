const Notification = require('../models/Notification');

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
