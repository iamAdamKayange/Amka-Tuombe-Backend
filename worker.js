require('dotenv').config();
const { videoQueue } = require('./queues/videoQueue');

console.log('🚀 Video processing worker started. Waiting for jobs...');