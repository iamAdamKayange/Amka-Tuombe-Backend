require('dotenv').config();
const { videoQueue } = require('./queues/videoQueue');

console.log('🚀 Video processing worker started. Waiting for jobs...');

// Optional: handle graceful shutdown
process.on('SIGINT', async () => {
  await videoQueue.close();
  process.exit(0);
});