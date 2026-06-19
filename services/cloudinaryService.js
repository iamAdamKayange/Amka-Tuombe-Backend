// services/cloudinaryService.js
const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;

/**
 * Upload video to Cloudinary (Direct)
 */
async function uploadVideo(localPath, title, folder = 'amka_tuombe_videos') {
  try {
    console.log('📤 Uploading video to Cloudinary...');
    console.log('📁 File:', localPath);
    console.log('📝 Title:', title);

    const result = await cloudinary.uploader.upload(localPath, {
      resource_type: 'video',
      folder: folder,
      public_id: `${Date.now()}_${title.replace(/\s+/g, '_')}`,
      eager: [
        { width: 300, height: 200, crop: 'fill', format: 'jpg' },
        { width: 640, height: 360, crop: 'fill', format: 'jpg' }
      ],
      eager_async: true,
    });

    console.log('✅ Cloudinary upload successful');
    console.log('📥 Public ID:', result.public_id);
    console.log('📥 Duration:', result.duration);
    console.log('📥 URL:', result.secure_url);

    // Delete local file after upload
    await fs.unlink(localPath).catch(() => {
      console.log('⚠️ Could not delete local file');
    });

    return {
      url: result.secure_url,
      thumbnail: result.eager?.[0]?.secure_url || result.thumbnail_url || '',
      duration: Math.round(result.duration || 0),
      public_id: result.public_id,
    };
  } catch (err) {
    console.error('❌ Cloudinary upload error:', err);
    throw err;
  }
}

/**
 * Upload audio to Cloudinary (Direct)
 */
async function uploadAudio(localPath, title, folder = 'amka_tuombe_audio') {
  try {
    console.log('🎵 Uploading audio to Cloudinary...');
    console.log('📁 File:', localPath);
    console.log('📝 Title:', title);

    const result = await cloudinary.uploader.upload(localPath, {
      resource_type: 'video', // Cloudinary uses 'video' for audio too
      folder: folder,
      public_id: `${Date.now()}_${title.replace(/\s+/g, '_')}`,
    });

    console.log('✅ Audio upload successful');
    console.log('📥 Public ID:', result.public_id);
    console.log('📥 Duration:', result.duration);
    console.log('📥 URL:', result.secure_url);

    await fs.unlink(localPath).catch(() => {
      console.log('⚠️ Could not delete local file');
    });

    return {
      url: result.secure_url,
      duration: Math.round(result.duration || 0),
      public_id: result.public_id,
    };
  } catch (err) {
    console.error('❌ Cloudinary audio upload error:', err);
    throw err;
  }
}

/**
 * Delete file from Cloudinary
 */
async function deleteFile(publicId, resourceType = 'video') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log('🗑️ Deleted from Cloudinary:', publicId, result.result);
    return result.result === 'ok';
  } catch (err) {
    console.error('❌ Delete error:', err);
    return false;
  }
}

module.exports = {
  uploadVideo,
  uploadAudio,
  deleteFile,
};