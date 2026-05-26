// Example Bull job for processing uploaded videos
const Queue = require('bull');
const videoQueue = new Queue('video processing', process.env.REDIS_URL);

videoQueue.process(async (job) => {
  const { teachingId, videoUrl } = job.data;
  console.log(`Processing video for teaching ${teachingId}: ${videoUrl}`);
  // Add logic: extract duration, generate thumbnail, etc.
  return { done: true };
});

const addVideoJob = (teachingId, videoUrl) => {
  return videoQueue.add({ teachingId, videoUrl });
};

module.exports = { addVideoJob };