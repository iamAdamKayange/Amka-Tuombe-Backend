const express = require('express');
const { getCurrentLive, startLive, endLive } = require('../controllers/liveController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/current', getCurrentLive);
router.post('/start', auth, startLive);
router.post('/end', auth, endLive);

module.exports = router;