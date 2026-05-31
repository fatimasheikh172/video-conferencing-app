# File Sharing Implementation Guide

## Overview
Complete secure file sharing system for the video conferencing collaboration app with drag & drop upload, real-time notifications, automatic expiration, and comprehensive security features.

---

## Installation

### Backend Dependencies

```bash
cd server
npm install multer node-cron
```

**Packages:**
- `multer` - File upload middleware for Express
- `node-cron` - Cron job scheduler for automatic file cleanup

### Frontend Dependencies

```bash
cd client
npm install react-dropzone
```

**Packages:**
- `react-dropzone` - Drag & drop file upload component

---

## Features Implemented

### Backend Features

#### 1. **File Upload Endpoint**
- **Route**: `POST /api/files/upload`
- **Authentication**: JWT required
- **Max file size**: 50MB
- **Supported types**: PDF, DOCX, XLSX, PNG, JPG, GIF, MP4, WEBM
- **File validation**: MIME type + extension check
- **Virus scan simulation**: Suspicious pattern detection
- **Room membership validation**: Only room members can upload

#### 2. **File Storage**
- Local filesystem storage in `server/uploads/`
- Unique filename generation with timestamp + random hash
- Filename sanitization to prevent path traversal
- File metadata stored in MongoDB

#### 3. **Secure Download System**
- **Signed URLs**: Expire in 1 hour
- **One-time use tokens**: Token deleted after download
- **Route**: `GET /api/files/:fileId/download-url` (get signed URL)
- **Route**: `GET /api/files/download/:token` (download with token)
- Download count tracking

#### 4. **File Management**
- **Get room files**: `GET /api/files/room/:roomId`
- **Delete file**: `DELETE /api/files/:fileId`
- Only uploader or room owner can delete files
- Automatic cleanup on deletion

#### 5. **Automatic Expiration**
- Files expire after 24 hours
- Cron job runs every hour to clean up expired files
- Orphaned file cleanup runs daily at 3 AM
- Real-time notification when files are deleted

#### 6. **Security Features**
- JWT authentication required for all endpoints
- Room membership validation
- File name sanitization
- MIME type validation
- File size limits (50MB)
- Suspicious pattern detection
- Signed download URLs with expiration

---

### Frontend Features

#### 1. **Drag & Drop Upload**
- Beautiful upload zone with visual feedback
- Drag & drop or click to upload
- File type validation
- Size validation (50MB max)
- Upload progress bar with percentage
- Real-time upload status

#### 2. **File List Panel**
- Sidebar panel showing all room files
- File type icons (color-coded):
  - 🔴 PDF - Red
  - 🔵 DOC/DOCX - Blue
  - 🟢 EXCEL - Green
  - 🟣 Images - Purple
  - 🩷 Videos - Pink
- File metadata display:
  - Original filename
  - File size (formatted)
  - Uploader name
  - Upload time (relative)

#### 3. **File Actions**
- **Download**: One-click download with signed URL
- **Copy Link**: Copy download link to clipboard
- **Delete**: Only for file uploader (with confirmation)
- **Preview**: Image preview in modal (PDF preview placeholder)

#### 4. **Real-time Updates**
- Socket.io integration
- Instant notification when files are uploaded
- Instant removal when files are deleted
- All room participants see updates immediately

#### 5. **User Experience**
- Loading states
- Error notifications
- Empty state with helpful message
- Responsive design
- Smooth animations
- Hover effects

---

## API Endpoints

### Upload File
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: <file>
- roomId: <string>

Response:
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "id": "...",
    "filename": "...",
    "originalName": "...",
    "mimeType": "...",
    "size": 1234567,
    "fileType": "pdf",
    "uploadedBy": { ... },
    "uploaderName": "...",
    "createdAt": "...",
    "formattedSize": "1.18 MB"
  }
}
```

### Get Room Files
```http
GET /api/files/room/:roomId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 5,
  "files": [ ... ]
}
```

### Get Download URL
```http
GET /api/files/:fileId/download-url
Authorization: Bearer <token>

Response:
{
  "success": true,
  "downloadUrl": "/api/files/download/<token>",
  "expiresAt": "2026-05-02T12:00:00.000Z"
}
```

### Download File
```http
GET /api/files/download/:token

Response: File stream with appropriate headers
```

### Delete File
```http
DELETE /api/files/:fileId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## Socket.io Events

### Client → Server
No direct file events (handled via HTTP)

### Server → Client

#### `file:uploaded`
```javascript
socket.on('file:uploaded', ({ file }) => {
  // New file uploaded to room
  // Add to file list
});
```

**Payload:**
```javascript
{
  file: {
    id: "...",
    filename: "...",
    originalName: "...",
    mimeType: "...",
    size: 1234567,
    fileType: "pdf",
    uploadedBy: { id, name, avatar },
    uploaderName: "...",
    createdAt: "...",
    formattedSize: "1.18 MB"
  }
}
```

#### `file:deleted`
```javascript
socket.on('file:deleted', ({ fileId, reason }) => {
  // File deleted from room
  // Remove from file list
});
```

**Payload:**
```javascript
{
  fileId: "...",
  reason: "expired" | undefined
}
```

---

## File Structure

### Backend Files
```
server/
├── src/
│   ├── models/
│   │   └── File.js                 # File model with metadata
│   ├── config/
│   │   └── fileUpload.js           # Multer configuration
│   ├── controllers/
│   │   └── fileController.js       # File endpoints logic
│   ├── routes/
│   │   └── fileRoutes.js           # File API routes
│   └── utils/
│       └── fileCleanup.js          # Cron jobs for cleanup
├── uploads/                        # File storage directory
└── server.js                       # Updated with file routes
```

### Frontend Files
```
client/
└── src/
    ├── components/
    │   └── File/
    │       └── FilePanel.jsx       # Main file panel component
    └── services/
        └── fileApi.js              # File API service
```

---

## Database Schema

### File Model
```javascript
{
  filename: String,           // Unique filename on disk
  originalName: String,       // Original filename from user
  mimeType: String,          // MIME type
  size: Number,              // File size in bytes
  path: String,              // Full path on disk
  roomId: String,            // Room ID (indexed)
  uploadedBy: ObjectId,      // User who uploaded (ref: User)
  uploaderName: String,      // Cached uploader name
  downloadCount: Number,     // Number of downloads
  expiresAt: Date,          // Expiration date (indexed)
  createdAt: Date,          // Upload timestamp
  updatedAt: Date           // Last update timestamp
}
```

**Indexes:**
- `roomId` - For fast room file queries
- `expiresAt` - For efficient cleanup queries

**Virtuals:**
- `fileType` - Computed from MIME type (pdf, doc, excel, image, video, other)

**Methods:**
- `getFormattedSize()` - Returns human-readable file size

---

## Security Implementation

### 1. **Authentication & Authorization**
- All endpoints require JWT authentication
- Room membership validation before upload/download
- Only uploader or room owner can delete files

### 2. **File Validation**
- MIME type whitelist
- File extension validation
- File size limit (50MB)
- Suspicious pattern detection (blocks .exe, .bat, .sh, etc.)

### 3. **Filename Sanitization**
```javascript
// Remove special characters
// Replace spaces with underscores
// Limit length to 255 characters
// Add unique suffix to prevent collisions
```

### 4. **Secure Downloads**
- Signed URLs with 1-hour expiration
- One-time use tokens
- Token validation before download
- Automatic token cleanup

### 5. **Path Traversal Prevention**
- Filename sanitization
- No user-controlled paths
- Files stored in dedicated directory

### 6. **Data Protection**
- Files deleted from disk when expired
- Database records cleaned up
- Orphaned files removed daily

---

## Cron Jobs

### File Cleanup (Hourly)
```javascript
// Runs: Every hour at minute 0
// Schedule: '0 * * * *'
// Action: Delete expired files (older than 24 hours)
```

**Process:**
1. Query files where `expiresAt <= now`
2. Delete file from disk
3. Emit `file:deleted` socket event
4. Delete database record
5. Log results

### Orphaned File Cleanup (Daily)
```javascript
// Runs: Daily at 3:00 AM
// Schedule: '0 3 * * *'
// Action: Delete files without database records
```

**Process:**
1. List all files in uploads directory
2. Query all file records from database
3. Compare and find orphaned files
4. Delete orphaned files from disk
5. Log results

---

## Usage Example

### Upload File
```javascript
import { uploadFile } from '../services/fileApi';

const handleUpload = async (file) => {
  try {
    const result = await uploadFile(
      roomId,
      file,
      (progress) => {
        console.log(`Upload progress: ${progress}%`);
      }
    );
    console.log('File uploaded:', result.file);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Download File
```javascript
import { getDownloadUrl, downloadFile } from '../services/fileApi';

const handleDownload = async (fileId, filename) => {
  try {
    const { downloadUrl } = await getDownloadUrl(fileId);
    await downloadFile(downloadUrl, filename);
  } catch (error) {
    console.error('Download failed:', error);
  }
};
```

### Copy Link
```javascript
import { copyDownloadLink } from '../services/fileApi';

const handleCopyLink = async (fileId) => {
  try {
    const url = await copyDownloadLink(fileId);
    alert('Link copied to clipboard!');
  } catch (error) {
    console.error('Copy failed:', error);
  }
};
```

---

## Testing Checklist

### Backend Tests
- [ ] Upload file with valid type
- [ ] Upload file exceeding 50MB (should fail)
- [ ] Upload file with invalid type (should fail)
- [ ] Upload without authentication (should fail)
- [ ] Upload to room user is not member of (should fail)
- [ ] Get room files
- [ ] Get download URL
- [ ] Download file with valid token
- [ ] Download file with expired token (should fail)
- [ ] Download file with invalid token (should fail)
- [ ] Delete own file
- [ ] Delete other user's file (should fail unless room owner)
- [ ] Cron job deletes expired files
- [ ] Orphaned file cleanup works

### Frontend Tests
- [ ] Drag & drop file upload
- [ ] Click to upload file
- [ ] Upload progress bar displays correctly
- [ ] File list displays all files
- [ ] File icons match file types
- [ ] Download file works
- [ ] Copy link to clipboard works
- [ ] Delete file works (with confirmation)
- [ ] Real-time file upload notification
- [ ] Real-time file deletion notification
- [ ] Image preview modal works
- [ ] Error messages display correctly
- [ ] Empty state displays when no files

---

## Error Handling

### Backend Errors
```javascript
// File too large
{ success: false, message: "File size exceeds maximum allowed size of 50MB" }

// Invalid file type
{ success: false, message: "File type not allowed" }

// Room not found
{ success: false, message: "Room not found" }

// Not a room member
{ success: false, message: "You are not a member of this room" }

// Unauthorized deletion
{ success: false, message: "You are not authorized to delete this file" }

// Invalid token
{ success: false, message: "Invalid or expired download token" }
```

### Frontend Error Handling
- Display error messages in red banner
- Auto-dismiss after 5 seconds
- Cleanup uploaded file on error
- Graceful fallback for failed operations

---

## Performance Considerations

### File Upload
- Chunked upload for large files
- Progress tracking
- Abort capability (can be added)

### File Storage
- Local filesystem (fast)
- Can be migrated to AWS S3/Azure Blob Storage
- Automatic cleanup prevents disk space issues

### Database Queries
- Indexed fields for fast queries
- Pagination can be added for large file lists

### Real-time Updates
- Socket.io for instant notifications
- Minimal payload size
- Only room participants receive updates

---

## Future Enhancements

- [ ] AWS S3 / Azure Blob Storage integration
- [ ] File compression for images
- [ ] Thumbnail generation for images/videos
- [ ] PDF preview with react-pdf
- [ ] Video preview player
- [ ] Batch file upload
- [ ] File search and filtering
- [ ] File categories/tags
- [ ] File versioning
- [ ] Collaborative file editing
- [ ] File comments/annotations
- [ ] Download all files as ZIP
- [ ] File sharing outside room (public links)
- [ ] File encryption at rest
- [ ] Virus scanning with ClamAV
- [ ] File analytics (views, downloads)

---

## Troubleshooting

### Upload fails with "File too large"
**Solution**: File exceeds 50MB limit. Compress or split the file.

### Upload fails with "File type not allowed"
**Solution**: Only PDF, DOCX, XLSX, PNG, JPG, GIF, MP4, WEBM are supported.

### Download link expired
**Solution**: Download links expire after 1 hour. Generate a new link.

### Files not appearing in list
**Solution**: Check room membership. Only room members can see files.

### Cron job not running
**Solution**: Check server logs. Ensure node-cron is installed.

### Uploads directory not created
**Solution**: Directory is created automatically. Check file permissions.

---

## Security Best Practices

1. **Never expose file paths** to clients
2. **Always validate file types** on server-side
3. **Use signed URLs** for downloads
4. **Implement rate limiting** for uploads
5. **Scan files for viruses** in production (use ClamAV)
6. **Encrypt files at rest** for sensitive data
7. **Use HTTPS** for all file transfers
8. **Audit file access** for compliance
9. **Implement file quotas** per user/room
10. **Regular security audits** of file handling code

---

## Implementation Complete ✅

All requested features have been implemented:
- ✅ File upload endpoint with validation
- ✅ Supported types: PDF, DOCX, XLSX, PNG, JPG, MP4
- ✅ File metadata stored in MongoDB
- ✅ Secure download with signed URLs (1 hour expiration)
- ✅ Virus scan simulation (file type + size validation)
- ✅ File deletion after 24 hours (cron job)
- ✅ Get all files in room endpoint
- ✅ Drag & drop file upload zone
- ✅ Upload progress bar
- ✅ File list panel with icons, metadata
- ✅ File type icons (color-coded)
- ✅ Download button + Copy link button
- ✅ Image preview in modal
- ✅ Real-time socket notifications
- ✅ JWT authentication required
- ✅ Room membership validation
- ✅ File name sanitization
- ✅ MIME type validation

**Ready for testing!**
