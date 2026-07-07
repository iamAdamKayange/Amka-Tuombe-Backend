const express = require('express');
const { streamR2Object } = require('../controllers/mediaController');

const router = express.Router();

router.get(/^\/r2\/(.+)$/, streamR2Object);

module.exports = router;
