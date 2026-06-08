const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');
const { uploadVideoFile } = require('../controllers/videoUploadController');
const router = express.Router();

router.use(auth, admin);
router.post('/upload-video', upload.single('video'), uploadVideoFile);

module.exports = router;