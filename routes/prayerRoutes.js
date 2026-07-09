const express = require('express');
const {
  createPrayerRequest,
  getPrayerRequests,
  updatePrayerStatus,
  deletePrayerRequest,
} = require('../controllers/prayerController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.post('/', createPrayerRequest);
router.get('/', auth, admin, getPrayerRequests);
router.patch('/:id/status', auth, admin, updatePrayerStatus);
router.delete('/:id', auth, admin, deletePrayerRequest);

module.exports = router;
