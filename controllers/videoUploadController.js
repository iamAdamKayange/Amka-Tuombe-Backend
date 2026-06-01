const { videoQueue } = require('../queues/videoQueue');
const Teaching = require('../models/Teaching');

exports.uploadVideoFile = async (req, res) => {
  // Admin check
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description required' });
  }

  // Insert pending
  const pending = await Teaching.createPending({
    title,
    description,
    createdBy: req.user.id
  });

  // Add to queue
  await videoQueue.add({
    teachingId: pending.id,
    localPath: req.file.path
  });

  res.status(202).json({ message: 'Video upload accepted, processing in background', teachingId: pending.id });
};