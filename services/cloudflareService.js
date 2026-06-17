// services/cloudflareService.js
const { cfApi } = require('../config/cloudflare');
const axios = require('axios');
const fs = require('fs');

async function getStreamDirectUpload({ title, maxDuration = 3600 }) {
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const response = await cfApi.post('/stream/direct_upload', {
    maxDurationSeconds: maxDuration,
    expiry,
    requireSignedURLs: false,
    allowedOrigins: ['*'],
    meta: { name: title || 'upload' },
  });
  if (!response.data.success) throw new Error(response.data.errors?.[0]?.message || 'CF direct upload failed');
  return {
    uploadURL: response.data.result.uploadURL,
    uid: response.data.result.uid,
  };
}

async function uploadVideoFromPath(localPath, title) {
  const { uploadURL, uid } = await getStreamDirectUpload({ title });
  
  const fileStream = fs.createReadStream(localPath);
  const response = await axios.put(uploadURL, fileStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Tus-Resumable': '1.0.0',
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 5000));

  const details = await cfApi.get(`/stream/${uid}`);
  if (!details.data.success) throw new Error('Failed to fetch stream details');
  
  const result = details.data.result;
  return {
    uid: result.uid,
    videoUrl: `https://customer-${process.env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${result.uid}/manifest/video.m3u8`,
    thumbnail: `https://customer-${process.env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${result.uid}/thumbnails/thumbnail.jpg`,
    duration: Math.round(result.duration || 0),
  };
}

async function deleteVideo(uid) {
  const response = await cfApi.delete(`/stream/${uid}`);
  return response.data.success;
}

module.exports = { getStreamDirectUpload, uploadVideoFromPath, deleteVideo };