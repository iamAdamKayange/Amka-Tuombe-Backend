const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/') ||
    file.mimetype.startsWith('image/')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only video, audio, and image files are allowed'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter, 
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

module.exports = upload;
