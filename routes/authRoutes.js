const express = require('express');
const { register, login, getMe, updateMe, uploadAvatar, deleteMe } = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', auth, getMe);
router.patch('/me', auth, updateMe);
router.post('/me/avatar', auth, upload.single('avatar'), uploadAvatar);
router.delete('/me', auth, deleteMe);

module.exports = router;
