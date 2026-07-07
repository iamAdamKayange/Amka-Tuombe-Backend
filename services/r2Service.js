const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const s3 = require('../config/r2');

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function sha256(value, encoding = 'hex') {
  return crypto.createHash('sha256').update(value).digest(encoding);
}

function amzDateParts(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function encodePathPart(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

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

function presignPutObject({ key, expiresIn = 3600 }) {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    throw new Error('R2 env hazijakamilika.');
  }

  const url = new URL(endpoint);
  const host = url.host;
  const region = 'auto';
  const service = 's3';
  const { amzDate, dateStamp } = amzDateParts();
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalUri = `/${encodePathPart(bucket)}/${key
    .split('/')
    .map(encodePathPart)
    .join('/')}`;

  const query = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((name) => `${encodeURIComponent(name)}=${encodeURIComponent(query[name])}`)
    .join('&');
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = hmac(signingKey, stringToSign, 'hex');

  return `${url.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function createDirectUpload({ folder, title, originalName, fallbackExtension = '.bin', expiresIn }) {
  const extension = path.extname(originalName || '') || fallbackExtension;
  const key = `${folder}/${Date.now()}_${safeKeyPart(title)}${extension}`;

  return {
    key,
    uploadUrl: presignPutObject({ key, expiresIn }),
    expiresIn: expiresIn || Number(process.env.CF_UPLOAD_EXPIRY || 3600),
  };
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
    if (
      pathname.startsWith('audio/') ||
      pathname.startsWith('videos/') ||
      pathname.startsWith('images/')
    ) {
      return decodeURIComponent(pathname);
    }
    return null;
  } catch (_) {
    return url.startsWith('audio/') ||
      url.startsWith('videos/') ||
      url.startsWith('images/')
      ? url
      : null;
  }
}

module.exports = {
  uploadAudio,
  uploadImage,
  createDirectUpload,
  getObjectStream,
  deleteObject,
  extractR2Key,
};
