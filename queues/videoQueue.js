const Queue = require('bull');
const cloudinary = require('../config/cloudinary');
const pool = require('../config/db');
const fs = require('fs').promises;

const videoQueue = new Queue('video processing', process.env.REDIS_URL);

videoQueue.process(async (job) => {
  const { teachingId, localPath } = job.data;
  console.log(`Processing video for teaching ${teachingId}`);

  // Upload to Cloudinary
  const result = await cloudinary.uploader.upload(localPath, {
    resource_type: 'video',
    folder: 'amka_tuombe_videos',
    eager: [{ width: 300, height: 200, crop: 'fill', format: 'jpg' }]
  });

  const duration = result.duration;
  const videoUrl = result.secure_url;
  const thumbnail = result.eager[0]?.secure_url || result.thumbnail_url;

  // Update database
  await pool.query(
    `UPDATE teachings SET video_url = $1, duration = $2, thumbnail = $3, status = 'completed', updated_at = NOW() WHERE id = $4`,
    [videoUrl, duration, thumbnail, teachingId]
  );

  // Delete local file
  await fs.unlink(localPath);

  return { success: true, videoUrl, duration, thumbnail };
});

module.exports = { videoQueue };