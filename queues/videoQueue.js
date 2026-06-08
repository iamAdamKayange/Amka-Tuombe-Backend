const Queue = require('bull');
const cloudinary = require('../config/cloudinary');
const pool = require('../config/db');
const fs = require('fs').promises;

const videoQueue = new Queue('video processing', process.env.REDIS_URL, {
  settings: { stalledInterval: 30000, maxStalledCount: 2 },
});

videoQueue.process(3, async (job) => {
  const { teachingId, localPath } = job.data;
  console.log(`Processing video for teaching ${teachingId}`);

  try {
    const result = await cloudinary.uploader.upload(localPath, {
      resource_type: 'video',
      folder: 'amka_tuombe_videos',
      eager: [{ width: 300, height: 200, crop: 'fill', format: 'jpg' }],
    });

    const duration = Math.round(result.duration);
    const videoUrl = result.secure_url;
    const thumbnail = result.eager[0]?.secure_url || result.thumbnail_url || '';

    await pool.query(
      `UPDATE teachings SET video_url = $1, duration = $2, thumbnail = $3, status = 'completed', updated_at = NOW() WHERE id = $4`,
      [videoUrl, duration, thumbnail, teachingId]
    );

    await fs.unlink(localPath).catch(() => {});
    return { success: true, videoUrl, duration, thumbnail };
  } catch (err) {
    console.error(`Processing failed for teaching ${teachingId}:`, err);
    await pool.query(`UPDATE teachings SET status = 'failed' WHERE id = $1`, [teachingId]);
    throw err;
  }
});

videoQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

module.exports = { videoQueue };