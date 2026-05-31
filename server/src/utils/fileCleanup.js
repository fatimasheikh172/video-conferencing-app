const cron = require('node-cron');
const File = require('../models/File');
const fs = require('fs').promises;

// Clean up expired files every hour
const scheduleFileCleanup = (io) => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running file cleanup job...');

      // Find all expired files
      const expiredFiles = await File.find({
        expiresAt: { $lte: new Date() }
      });

      if (expiredFiles.length === 0) {
        console.log('No expired files to clean up');
        return;
      }

      console.log(`Found ${expiredFiles.length} expired files to delete`);

      let deletedCount = 0;
      let errorCount = 0;

      for (const file of expiredFiles) {
        try {
          // Delete file from disk
          await fs.unlink(file.path);
          console.log(`Deleted file from disk: ${file.filename}`);

          // Emit socket event to room
          if (io) {
            io.to(file.roomId).emit('file:deleted', {
              fileId: file._id,
              reason: 'expired'
            });
          }

          // Delete file record from database
          await File.findByIdAndDelete(file._id);
          deletedCount++;
        } catch (error) {
          console.error(`Error deleting file ${file.filename}:`, error);
          errorCount++;

          // Still delete from database even if file deletion failed
          await File.findByIdAndDelete(file._id).catch(() => {});
        }
      }

      console.log(`File cleanup completed: ${deletedCount} deleted, ${errorCount} errors`);
    } catch (error) {
      console.error('Error in file cleanup job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Karachi",
    recoverMissedExecutions: false
  });

  console.log('File cleanup cron job scheduled (runs every hour)');
};

// Clean up orphaned files (files without database records)
const cleanupOrphanedFiles = async () => {
  try {
    const uploadDir = require('../config/fileUpload').uploadDir;
    const filesOnDisk = await fs.readdir(uploadDir);

    // Get all file records from database
    const filesInDb = await File.find({}, 'filename');
    const dbFilenames = new Set(filesInDb.map(f => f.filename));

    let orphanedCount = 0;

    for (const filename of filesOnDisk) {
      if (!dbFilenames.has(filename)) {
        try {
          const filePath = require('path').join(uploadDir, filename);
          await fs.unlink(filePath);
          orphanedCount++;
          console.log(`Deleted orphaned file: ${filename}`);
        } catch (error) {
          console.error(`Error deleting orphaned file ${filename}:`, error);
        }
      }
    }

    if (orphanedCount > 0) {
      console.log(`Cleaned up ${orphanedCount} orphaned files`);
    }
  } catch (error) {
    console.error('Error cleaning up orphaned files:', error);
  }
};

// Schedule orphaned file cleanup (runs daily at 3 AM)
const scheduleOrphanedFileCleanup = () => {
  cron.schedule('0 3 * * *', async () => {
    console.log('Running orphaned file cleanup job...');
    await cleanupOrphanedFiles();
  }, {
    scheduled: true,
    timezone: "Asia/Karachi",
    recoverMissedExecutions: false
  });

  console.log('Orphaned file cleanup cron job scheduled (runs daily at 3 AM)');
};

module.exports = {
  scheduleFileCleanup,
  scheduleOrphanedFileCleanup,
  cleanupOrphanedFiles
};
