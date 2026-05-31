const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../config/fileUpload');
const { validateRoomId, validateFileId } = require('../middleware/inputValidation');
const { fileUploadLimiter } = require('../middleware/rateLimiter');
const {
  uploadFile,
  getRoomFiles,
  getDownloadUrl,
  downloadFile,
  deleteFile
} = require('../controllers/fileController');

// Upload file (requires auth and rate limiting)
// Handle multer errors
router.post('/upload', protect, fileUploadLimiter, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);

      // Handle multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the maximum limit of 50MB'
        });
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected field in file upload'
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }

    // If no error, proceed to controller
    next();
  });
}, uploadFile);

// Get all files in a room (requires auth)
router.get('/room/:roomId', protect, validateRoomId, getRoomFiles);

// Get signed download URL (requires auth)
router.get('/:fileId/download-url', protect, validateFileId, getDownloadUrl);

// Delete file (requires auth)
router.delete('/:fileId', protect, validateFileId, deleteFile);

// Download file with signed token (no auth required, token validates)
router.get('/download/:token', downloadFile);

module.exports = router;
