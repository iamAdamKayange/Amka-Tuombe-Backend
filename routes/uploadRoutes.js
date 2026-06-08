const express = require('express');
const { getUploadSignature } = require('../controllers/uploadController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/signature', auth, getUploadSignature);

module.exports = router;