const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const s3 = require('../config/r2');

function safeKeyPart(value) {
  return (value || 'upload')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90);
}

function publicUrlForKey(key) {
  const publicBase = process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL;
  if (publicBase) {
    return `${publicBase.replace(/\/+$/, '')}/${encodeURI(key)}`;
  }

  const endpoint = (process.env.R2_ENDPOINT || '').replace(/\/+$/, '');
  const bucket = process.env.R2_BUCKET;
  return `${endpoint}/${bucket}/${encodeURI(key)}`;
}

async function removeLocalFile(localPath) {
  await fsp.unlink(localPath).catch(() => {
    console.warn('Could not delete local upload file');
  });
}

async function uploadFile(localPath, { folder, title, originalName, contentType, fallbackExtension }) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error('R2_BUCKET haijawekwa kwenye env.');

  const extension = path.extname(originalName || localPath) || fallbackExtension;
  const key = `${folder}/${Date.now()}_${safeKeyPart(title)}${extension}`;
  const stat = await fsp.stat(localPath);

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentLength: stat.size,
    ContentType: contentType || 'application/octet-stream',
  }));

  await removeLocalFile(localPath);

  return {
    url: publicUrlForKey(key),
    key,
    bytes: stat.size,
  };
}

async function uploadAudio(localPath, { title, originalName, contentType }) {
  return uploadFile(localPath, {
    folder: 'audio',
    title,
    originalName,
    contentType: contentType || 'audio/mpeg',
    fallbackExtension: '.mp3',
  });
}

async function uploadImage(localPath, { title, originalName, contentType }) {
  return uploadFile(localPath, {
    folder: 'images',
    title,
    originalName,
    contentType: contentType || 'image/jpeg',
    fallbackExtension: '.jpg',
  });
}

async function getObjectStream(key, range) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket || !key) throw new Error('R2 object haijapatikana.');

  return s3.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(range ? { Range: range } : {}),
  }));
}

async function deleteObject(key) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket || !key) return false;

  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    return true;
  } catch (error) {
    console.error('R2 delete error:', error.message);
    return false;
  }
}

function extractR2Key(url) {
  if (!url) return null;

  try {
    const pathname = new URL(url).pathname.replace(/^\/+/, '');
    const bucket = process.env.R2_BUCKET;
    if (bucket && pathname.startsWith(`${bucket}/`)) {
      return decodeURIComponent(pathname.slice(bucket.length + 1));
    }
    if (pathname.startsWith('audio/')) return decodeURIComponent(pathname);
    return null;
  } catch (_) {
    return url.startsWith('audio/') ? url : null;
  }
}

module.exports = {
  uploadAudio,
  uploadImage,
  getObjectStream,
  deleteObject,
  extractR2Key,
};
