// services/cloudflareService.js

const { cfApi } = require('../config/cloudflare');
const axios = require('axios');
const fs = require('fs');

async function getStreamDirectUpload({ title, maxDuration = 3600 }) {
  try {
    const response = await cfApi.post('/stream/direct_upload', {
      maxDurationSeconds: maxDuration,
      expiry: Math.floor(Date.now() / 1000) + 3600,
      requireSignedURLs: false,
      allowedOrigins: ['*'],
      meta: {
        name: title || 'upload',
      },
    });

    console.log('==========================');
    console.log('CF DIRECT UPLOAD SUCCESS');
    console.log(response.data);
    console.log('==========================');

    return {
      uploadURL: response.data.result.uploadURL,
      uid: response.data.result.uid,
    };
  } catch (err) {
    console.error('==========================');
    console.error('CF DIRECT UPLOAD ERROR');
    console.error(err.response?.data || err.message);
    console.error('==========================');

    throw err;
  }
}

async function uploadVideoFromPath(localPath, title) {
  try {
    const { uploadURL, uid } = await getStreamDirectUpload({
      title,
    });

    console.log('==========================');
    console.log('UPLOAD URL:', uploadURL);
    console.log('UID:', uid);
    console.log('==========================');

    const fileStream = fs.createReadStream(localPath);

    const response = await axios.put(
      uploadURL,
      fileStream,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Tus-Resumable': '1.0.0',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
      }
    );

    console.log('==========================');
    console.log('CF UPLOAD STATUS:', response.status);
    console.log('CF UPLOAD DATA:', response.data);
    console.log('==========================');

    if (response.status >= 400) {
      throw new Error(
        `Cloudflare upload failed. Status ${response.status}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const details = await cfApi.get(`/stream/${uid}`);

    console.log('==========================');
    console.log('CF VIDEO DETAILS');
    console.log(details.data);
    console.log('==========================');

    const result = details.data.result;

    return {
      uid: result.uid,
      videoUrl:
        `https://customer-${process.env.CLOUDFLARE_ACCOUNT_ID}` +
        `.cloudflarestream.com/${result.uid}/manifest/video.m3u8`,
      thumbnail:
        `https://customer-${process.env.CLOUDFLARE_ACCOUNT_ID}` +
        `.cloudflarestream.com/${result.uid}/thumbnails/thumbnail.jpg`,
      duration: Math.round(result.duration || 0),
    };
  } catch (err) {
    console.error('==========================');
    console.error('UPLOAD VIDEO ERROR');
    console.error(err.response?.data || err.message);
    console.error('==========================');

    throw err;
  }
}

async function deleteVideo(uid) {
  const response = await cfApi.delete(`/stream/${uid}`);
  return response.data.success;
}

module.exports = {
  getStreamDirectUpload,
  uploadVideoFromPath,
  deleteVideo,
};