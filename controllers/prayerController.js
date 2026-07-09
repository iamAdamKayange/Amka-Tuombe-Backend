const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const PrayerRequest = require('../models/PrayerRequest');
const { emitPrayerChanged } = require('../services/realtimeService');
const { sendPushToAdmins } = require('../services/pushNotificationService');

const allowedStatuses = new Set(['new', 'praying', 'done']);

async function optionalUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.slice('Bearer '.length).trim();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, email, full_name FROM users WHERE id = $1',
      [decoded.userId],
    );
    return rows[0] || null;
  } catch (_) {
    return null;
  }
}

exports.createPrayerRequest = async (req, res) => {
  try {
    const message = req.body.message?.trim();
    if (!message || message.length < 5) {
      return res.status(400).json({ error: 'Andika ombi lako vizuri' });
    }
    if (message.length > 1500) {
      return res.status(400).json({ error: 'Ombi ni refu sana' });
    }

    const user = await optionalUser(req);
    const fullName =
      req.body.fullName?.trim() ||
      req.body.full_name?.trim() ||
      user?.full_name ||
      'Mgeni';
    const phone = req.body.phone?.trim() || null;
    const email = req.body.email?.trim() || user?.email || null;

    const prayer = await PrayerRequest.create({
      fullName,
      phone,
      email,
      message,
      userId: user?.id || null,
    });

    emitPrayerChanged('created', prayer);
    sendPushToAdmins({
      id: prayer.id,
      type: 'prayer',
      title: 'Ombi jipya limeingia',
      body: `${prayer.full_name}: ${prayer.message}`.slice(0, 180),
      media_id: prayer.id,
      url: 'admin_prayers',
    }).catch((error) => {
      console.error('Prayer admin push error:', error.message);
    });
    return res.status(201).json(prayer);
  } catch (err) {
    console.error('Create prayer request error:', err);
    return res.status(500).json({ error: 'Imeshindikana kutuma ombi' });
  }
};

exports.getPrayerRequests = async (req, res) => {
  try {
    const prayers = await PrayerRequest.findAll({
      status: req.query.status || null,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json(prayers);
  } catch (err) {
    console.error('Get prayer requests error:', err);
    return res.status(500).json({ error: 'Imeshindikana kupata maombi' });
  }
};

exports.updatePrayerStatus = async (req, res) => {
  try {
    const status = req.body.status?.trim();
    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ error: 'Status si sahihi' });
    }

    const prayer = await PrayerRequest.updateStatus(req.params.id, status);
    if (!prayer) return res.status(404).json({ error: 'Ombi halijapatikana' });

    emitPrayerChanged('updated', prayer);
    return res.json(prayer);
  } catch (err) {
    console.error('Update prayer request error:', err);
    return res.status(500).json({ error: 'Imeshindikana kubadili status' });
  }
};

exports.deletePrayerRequest = async (req, res) => {
  try {
    const prayer = await PrayerRequest.deleteById(req.params.id);
    if (!prayer) return res.status(404).json({ error: 'Ombi halijapatikana' });

    emitPrayerChanged('deleted', { id: prayer.id });
    return res.json({ message: 'Ombi limefutwa', id: prayer.id });
  } catch (err) {
    console.error('Delete prayer request error:', err);
    return res.status(500).json({ error: 'Imeshindikana kufuta ombi' });
  }
};
