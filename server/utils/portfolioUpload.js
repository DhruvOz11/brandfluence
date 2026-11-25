const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const uploadsDirectory = path.join(__dirname, '..', 'uploads');
const supportedMedia = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm']
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdir(uploadsDirectory, { recursive: true }, error => {
      callback(error, uploadsDirectory);
    });
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const fileFilter = (req, file, callback) => {
  const extensions = supportedMedia[file.mimetype];
  const extension = path.extname(file.originalname).toLowerCase();

  if (!extensions || !extensions.includes(extension)) {
    const error = new Error('Unsupported media type. Use JPG, PNG, WebP, MP4, or WebM.');
    error.code = 'UNSUPPORTED_MEDIA_TYPE';
    return callback(error);
  }

  return callback(null, true);
};

const profileImageUpload = multer({
  storage,
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      const error = new Error('Profile images must be JPG, PNG, or WebP.');
      error.code = 'UNSUPPORTED_MEDIA_TYPE';
      return callback(error);
    }

    return fileFilter(req, file, callback);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

const portfolioUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1
  }
});

const hasValidFileSignature = async file => {
  const handle = await fs.promises.open(file.path, 'r');
  const header = Buffer.alloc(12);

  try {
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead < 12) return false;

    switch (file.mimetype) {
      case 'image/jpeg':
        return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      case 'image/png':
        return header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      case 'image/webp':
        return header.toString('ascii', 0, 4) === 'RIFF'
          && header.toString('ascii', 8, 12) === 'WEBP';
      case 'video/mp4':
        return header.toString('ascii', 4, 8) === 'ftyp';
      case 'video/webm':
        return header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      default:
        return false;
    }
  } finally {
    await handle.close();
  }
};

const removePortfolioFile = filename => (
  fs.promises.unlink(path.join(uploadsDirectory, path.basename(filename)))
);

module.exports = {
  portfolioUpload,
  profileImageUpload,
  hasValidFileSignature,
  removePortfolioFile
};
