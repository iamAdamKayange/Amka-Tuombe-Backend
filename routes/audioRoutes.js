const express = require('express');
const { getAllAudio, getAudioById, createAudio } = require('../controllers/audioController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', getAllAudio);
router.get('/:id', getAudioById);
router.post('/', auth, createAudio);

module.exports = router;