const AudioSermon = require('../models/AudioSermon');
const { validateAudio } = require('../middleware/validate');

exports.getAllAudio = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const audio = await AudioSermon.findAll(limit, offset);
    res.json(audio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAudioById = async (req, res) => {
  try {
    const audio = await AudioSermon.findById(req.params.id);
    if (!audio) return res.status(404).json({ error: 'Audio not found' });
    await AudioSermon.incrementPlays(req.params.id);
    res.json(audio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAudio = async (req, res) => {
  try {
    const { error } = validateAudio(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    
    const audio = await AudioSermon.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(audio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};