// queues/videoQueue.js

const Queue = require('bull');
const { uploadVideoFromPath } = require('../services/cloudflareService');
const pool = require('../config/db');
const fs = require('fs').promises;

const videoQueue = new Queue(
  'video processing',
  process.env.REDIS_URL,
  {
    settings: {
      stalledInterval: 30000,
      maxStalledCount: 2,
    },
  }
);

videoQueue.process(3, async (job) => {
  const { teachingId, localPath, title } = job.data;

  console.log('=================================');
  console.log(`Processing teaching ${teachingId}`);
  console.log(`Local file: ${localPath}`);
  console.log(`Title: ${title}`);
  console.log('=================================');

  try {
    const result = await uploadVideoFromPath(
      localPath,
      title || `Teaching ${teachingId}`
    );

    console.log('=================================');
    console.log('UPLOAD SUCCESS');
    console.log(result);
    console.log('=================================');

    await pool.query(
      `
      UPDATE teachings
      SET
        video_url = $1,
        duration = $2,
        thumbnail = $3,
        status = 'completed',
        updated_at = NOW()
      WHERE id = $4
      `,
      [
        result.videoUrl,
        result.duration,
        result.thumbnail,
        teachingId,
      ]
    );

    await fs.unlink(localPath).catch((err) => {
      console.warn(
        `Could not delete local file ${localPath}:`,
        err.message
      );
    });

    return {
      success: true,
      ...result,
    };
  } catch (err) {
    console.error('=================================');
    console.error('UPLOAD FAILED');
    console.error('Teaching ID:', teachingId);
    console.error('Status:', err.response?.status);
    console.error('Response:', err.response?.data);
    console.error('Message:', err.message);
    console.error('=================================');

    try {
      await pool.query(
        `
        UPDATE teachings
        SET status = 'failed',
            updated_at = NOW()
        WHERE id = $1
        `,
        [teachingId]
      );
    } catch (dbErr) {
      console.error(
        'Failed to update teaching status:',
        dbErr.message
      );
    }

    throw err;
  }
});

videoQueue.on('completed', (job, result) => {
  console.log('=================================');
  console.log(`Job ${job.id} completed`);
  console.log(result);
  console.log('=================================');
});

videoQueue.on('failed', (job, err) => {
  console.error('=================================');
  console.error(`Job ${job?.id} failed`);
  console.error(err.message);
  console.error('=================================');
});

videoQueue.on('error', (err) => {
  console.error('=================================');
  console.error('QUEUE ERROR');
  console.error(err);
  console.error('=================================');
});

module.exports = {
  videoQueue,
};