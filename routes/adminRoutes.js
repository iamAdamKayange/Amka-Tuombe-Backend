const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');
const { uploadVideoFile } = require('../controllers/videoUploadController');

router.use(auth, admin);   // kila route hapa itahitaji kuwa admin

router.post('/upload-video', upload.single('video'), uploadVideoFile);
// unaweza kuongeza ruti nyingine za admin (startLive, endLive, deleteUser, nk)

module.exports = router;