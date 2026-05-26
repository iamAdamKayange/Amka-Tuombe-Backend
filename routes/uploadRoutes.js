const express = require('express');
const { getUploadSignature, uploadTeaching } = require('../controllers/uploadController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/signature', auth, getUploadSignature);
router.post('/', auth, uploadTeaching);

module.exports = router;