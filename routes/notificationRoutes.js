const express = require('express');
const {
  getNotifications,
  registerDeviceToken,
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', getNotifications);
router.post('/device-token', registerDeviceToken);

module.exports = router;
