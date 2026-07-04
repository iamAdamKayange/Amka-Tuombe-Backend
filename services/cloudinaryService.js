const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;

function safePublicId(title) {
  return `${Date.now()}_${title}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

function videoUrl(publicId, transformation = []) {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    secure: true,
    transformation,
  });
}

function buildVideoDelivery(publicId, duration = 0) {
  const previewSecond = Math.max(1, Math.min(8, Math.floor(duration * 0.08) || 1));

  return {
    playbackUrl: videoUrl(publicId, [
      { quality: 'auto:eco', fetch_format: 'auto' },
    ]),
    thumbnailUrl: videoUrl(publicId, [
      {
        start_offset: `${previewSecond}`,
        width: 960,
        height: 540,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto',
        fetch_format: 'jpg',
      },
    ]),
    posterUrl: videoUrl(publicId, [
      {
        start_offset: `${previewSecond}`,
        width: 1280,
        height: 720,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto:good',
        fetch_format: 'jpg',
      },
    ]),
  };
}

async function removeLocalFile(localPath) {
  await fs.unlink(localPath).catch(() => {
    console.warn('Could not delete local upload file');
  });
}

async function uploadVideo(localPath, title, folder = 'amka_tuombe_videos') {
  try {
    console.log('Uploading video to Cloudinary:', localPath);

    const result = await cloudinary.uploader.upload(localPath, {
      resource_type: 'video',
      folder,
      public_id: safePublicId(title),
      quality: 'auto:eco',
      chunk_size: 6_000_000,
      eager: [
        {
          width: 480,
          height: 270,
          crop: 'fill',
          gravity: 'auto',
          quality: 'auto',
          format: 'jpg',
          start_offset: '1',
        },
        {
          width: 960,
          height: 540,
          crop: 'fill',
          gravity: 'auto',
          quality: 'auto:good',
          format: 'jpg',
          start_offset: '3',
        },
      ],
      eager_async: false,
    });

    await removeLocalFile(localPath);

    const duration = Math.round(result.duration || 0);
    const delivery = buildVideoDelivery(result.public_id, duration);

    return {
      url: delivery.playbackUrl || result.secure_url,
      thumbnail:
        result.eager?.[1]?.secure_url ||
        result.eager?.[0]?.secure_url ||
        delivery.thumbnailUrl,
      poster: delivery.posterUrl,
      duration,
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format,
    };
  } catch (err) {
    console.error('Cloudinary video upload error:', err);
    throw err;
  }
}

async function uploadAudio(localPath, title, folder = 'amka_tuombe_audio') {
  try {
    console.log('Uploading audio to Cloudinary:', localPath);

    const result = await cloudinary.uploader.upload(localPath, {
      resource_type: 'video',
      folder,
      public_id: safePublicId(title),
      quality: 'auto:eco',
    });

    await removeLocalFile(localPath);

    return {
      url: result.secure_url,
      duration: Math.round(result.duration || 0),
      public_id: result.public_id,
    };
  } catch (err) {
    console.error('Cloudinary audio upload error:', err);
    throw err;
  }
}

async function deleteFile(publicId, resourceType = 'video') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result.result === 'ok';
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    return false;
  }
}

module.exports = {
  uploadVideo,
  uploadAudio,
  deleteFile,
  buildVideoDelivery,
};
