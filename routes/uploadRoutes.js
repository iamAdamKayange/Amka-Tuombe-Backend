// routes/uploadRoutes.js
const express = require('express');
const { getUploadSignature } = require('../controllers/uploadController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const router = express.Router();

// Sasa inarejesha direct upload URL kwa Cloudflare (badala ya signature)
router.get('/signature', auth, admin, getUploadSignature);

module.exports = router;
