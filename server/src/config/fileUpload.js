const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',

  // Images
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',

  // Videos
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov'
};

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random hash
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const sanitizedName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);

    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
  // Check if MIME type is allowed
  if (!ALLOWED_FILE_TYPES[file.mimetype]) {
    return cb(
      new Error(`File type ${file.mimetype} is not allowed. Allowed types: PDF, DOCX, XLSX, PNG, JPG, MP4`),
      false
    );
  }

  // Additional extension check
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = Object.values(ALLOWED_FILE_TYPES);

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(`File extension ${ext} is not allowed`),
      false
    );
  }

  cb(null, true);
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only one file at a time
  }
});

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};

// Get file type category from MIME type
const getFileTypeCategory = (mimeType) => {
  const mime = mimeType.toLowerCase();

  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('word') || mime.includes('document')) return 'doc';
  if (mime.includes('sheet') || mime.includes('excel')) return 'excel';
  if (mime.includes('image')) return 'image';
  if (mime.includes('video')) return 'video';

  return 'other';
};

// Validate file (virus scan simulation)
const validateFile = (file) => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  // Check MIME type
  if (!ALLOWED_FILE_TYPES[file.mimetype]) {
    return {
      valid: false,
      error: 'File type not allowed'
    };
  }

  // Simulate virus scan (in production, use ClamAV or similar)
  // Check for suspicious file names
  const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs'];
  const filename = file.originalname.toLowerCase();

  for (const pattern of suspiciousPatterns) {
    if (filename.includes(pattern)) {
      return {
        valid: false,
        error: 'File contains suspicious patterns'
      };
    }
  }

  return { valid: true };
};

module.exports = {
  upload,
  sanitizeFilename,
  getFileTypeCategory,
  validateFile,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  uploadDir
};
