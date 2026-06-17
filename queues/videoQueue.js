// queues/videoQueue.js
const Queue = require('bull');
const { uploadVideoFromPath } = require('../services/cloudflareService');
const pool = require('../config/db');
const fs = require('fs').promises;

const videoQueue = new Queue('video processing', process.env.REDIS_URL, {
  settings: { stalledInterval: 30000, maxStalledCount: 2 },
});

videoQueue.process(3, async (job) => {
  const { teachingId, localPath, title } = job.data;
  console.log(`Processing video for teaching ${teachingId} via Cloudflare`);

  try {
    const result = await uploadVideoFromPath(localPath, title || `Teaching ${teachingId}`);

    await pool.query(
      `UPDATE teachings 
       SET video_url = $1, duration = $2, thumbnail = $3, status = 'completed', updated_at = NOW() 
       WHERE id = $4`,
      [result.videoUrl, result.duration, result.thumbnail, teachingId]
    );

    await fs.unlink(localPath).catch(() => {});
    return { success: true, ...result };
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