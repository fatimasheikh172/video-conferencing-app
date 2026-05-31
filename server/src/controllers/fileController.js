const File = require('../models/File');
const Room = require('../models/Room');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { validateFile, uploadDir } = require('../config/fileUpload');
const { logFileEvent } = require('../utils/auditLogger');

// Upload file
const uploadFile = async (req, res) => {
  try {
    console.log('File upload request received:', {
      body: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null,
      userId: req.user?.id
    });

    const { roomId } = req.body;

    // Validate room ID
    if (!roomId) {
      console.log('Upload failed: No roomId provided');
      // Clean up uploaded file
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      console.log('Upload failed: No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file
    const validation = validateFile(req.file);
    if (!validation.valid) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    // Check if room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is a participant in the room
    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isParticipant) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }

    // Create file record
    const file = await File.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      roomId,
      uploadedBy: req.user.id,
      uploaderName: req.user.name,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Populate uploader info
    await file.populate('uploadedBy', 'name email avatar');

    // Emit socket event to room
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('file:uploaded', {
        file: {
          id: file._id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          fileType: file.fileType,
          uploadedBy: {
            id: file.uploadedBy._id,
            name: file.uploadedBy.name,
            avatar: file.uploadedBy.avatar
          },
          uploaderName: file.uploaderName,
          createdAt: file.createdAt,
          formattedSize: file.getFormattedSize()
        }
      });
    }

    // Log file upload
    await logFileEvent('file.upload', req, file._id, {
      fileName: file.originalName,
      fileSize: file.size,
      fileType: file.fileType,
      roomId: file.roomId,
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: file._id,
        fileName: file.originalName,
        fileType: file.mimeType,
        fileSize: file.size,
        uploadedBy: {
          id: file.uploadedBy._id,
          name: file.uploadedBy.name,
          avatar: file.uploadedBy.avatar
        },
        uploadedAt: file.createdAt
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);

    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
};

// Get all files in a room
const getRoomFiles = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check if room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is a participant
    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }

    // Get all files in the room
    const files = await File.find({ roomId })
      .populate('uploadedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    // Format files
    const formattedFiles = files.map(file => ({
      id: file._id,
      fileName: file.originalName,
      fileType: file.mimeType,
      fileSize: file.size,
      uploadedBy: {
        id: file.uploadedBy._id,
        name: file.uploadedBy.name,
        avatar: file.uploadedBy.avatar
      },
      uploadedAt: file.createdAt
    }));

    res.status(200).json({
      success: true,
      count: formattedFiles.length,
      files: formattedFiles
    });
  } catch (error) {
    console.error('Error getting room files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get files',
      error: error.message
    });
  }
};

// Generate signed download URL
const getDownloadUrl = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Find file
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if room exists
    const room = await Room.findOne({ roomId: file.roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is a participant
    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to download this file'
      });
    }

    // Check if file exists on disk
    try {
      await fs.access(file.path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Generate signed token (expires in 1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    // Store token in memory (in production, use Redis)
    if (!global.downloadTokens) {
      global.downloadTokens = new Map();
    }
    global.downloadTokens.set(token, {
      fileId: file._id.toString(),
      userId: req.user.id,
      expiresAt
    });

    // Clean up expired tokens
    for (const [key, value] of global.downloadTokens.entries()) {
      if (value.expiresAt < Date.now()) {
        global.downloadTokens.delete(key);
      }
    }

    // Increment download count
    file.downloadCount += 1;
    await file.save();

    // Log download URL generation
    await logFileEvent('file.download.url', req, file._id, {
      fileName: file.originalName,
      fileSize: file.size,
      roomId: file.roomId,
      status: 'success'
    });

    res.status(200).json({
      success: true,
      downloadUrl: `/api/files/download/${token}`,
      expiresAt: new Date(expiresAt)
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate download URL',
      error: error.message
    });
  }
};

// Download file with signed URL
const downloadFile = async (req, res) => {
  try {
    const { token } = req.params;

    // Check if token exists
    if (!global.downloadTokens || !global.downloadTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired download token'
      });
    }

    const tokenData = global.downloadTokens.get(token);

    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      global.downloadTokens.delete(token);
      return res.status(401).json({
        success: false,
        message: 'Download token has expired'
      });
    }

    // Find file
    const file = await File.findById(tokenData.fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if file exists on disk
    try {
      await fs.access(file.path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Delete token after use (one-time use)
    global.downloadTokens.delete(token);

    // Log file download
    await logFileEvent('file.download', req, file._id, {
      fileName: file.originalName,
      fileSize: file.size,
      roomId: file.roomId,
      userId: tokenData.userId,
      status: 'success'
    });

    // Set headers for download
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Length', file.size);

    // Stream file
    const fileStream = require('fs').createReadStream(file.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message
    });
  }
};

// Delete file
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Find file
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user is the uploader or room owner
    const room = await Room.findOne({ roomId: file.roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const isUploader = file.uploadedBy.toString() === req.user.id;
    const isRoomOwner = room.createdBy.toString() === req.user.id;

    if (!isUploader && !isRoomOwner) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this file'
      });
    }

    // Delete file from disk
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error('Error deleting file from disk:', error);
    }

    // Delete file record
    await File.findByIdAndDelete(fileId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(file.roomId).emit('file:deleted', {
        fileId: file._id
      });
    }

    // Log file deletion
    await logFileEvent('file.delete', req, file._id, {
      fileName: file.originalName,
      fileSize: file.size,
      roomId: file.roomId,
      deletedBy: req.user.id,
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message
    });
  }
};

module.exports = {
  uploadFile,
  getRoomFiles,
  getDownloadUrl,
  downloadFile,
  deleteFile
};
