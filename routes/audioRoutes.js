const express = require('express');
const {
  getAllAudio,
  getAudioById,
  createAudio,
  updateAudio,
  deleteAudio,
} = require('../controllers/audioController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload'); // Reuse multer config
const router = express.Router();

// Public routes
router.get('/', getAllAudio);
router.get('/:id', getAudioById);

// Admin route for file upload (multipart/form-data)
router.post('/upload', auth, admin, upload.single('audio'), createAudio);
router.patch('/:id', auth, admin, updateAudio);
router.delete('/:id', auth, admin, deleteAudio);

// (Optional) JSON endpoint for URL-based audio – if needed
// router.post('/', auth, createAudio);

module.exports = router;
