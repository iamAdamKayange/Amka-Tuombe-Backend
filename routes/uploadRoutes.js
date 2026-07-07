// routes/uploadRoutes.js
const express = require('express');
const { getUploadSignature, uploadImage } = require('../controllers/uploadController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');
const router = express.Router();

// Sasa inarejesha direct upload URL kwa Cloudflare (badala ya signature)
router.get('/signature', auth, admin, getUploadSignature);
router.post('/image', auth, admin, upload.single('image'), uploadImage);

module.exports = router;
