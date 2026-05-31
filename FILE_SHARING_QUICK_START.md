# File Sharing - Quick Start Guide

## Installation

### Step 1: Install Backend Dependencies

```bash
cd server
npm install multer node-cron
```

### Step 2: Install Frontend Dependencies

```bash
cd client
npm install react-dropzone
```

### Step 3: Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

---

## Quick Test Scenario

### Setup (2 users in a room)

1. **User 1 (Alice):**
   - Open browser: `http://localhost:3000`
   - Login/Register
   - Join room: `/room/test-123`

2. **User 2 (Bob):**
   - Open incognito/another browser: `http://localhost:3000`
   - Login/Register
   - Join same room: `/room/test-123`

### Test File Upload

**Alice uploads a file:**
1. Click the **Files** button (document icon) in control bar
2. File panel opens on the right side
3. Drag & drop a PDF file OR click the upload zone
4. Select a file (PDF, DOCX, PNG, etc.)
5. ✅ Upload progress bar shows 0% → 100%
6. ✅ File appears in the list with icon, name, size
7. ✅ Bob sees the file instantly (real-time notification)

### Test File Download

**Bob downloads Alice's file:**
1. Bob sees the file in his file panel
2. Click the **Download** button (down arrow icon)
3. ✅ File downloads to Bob's computer
4. ✅ Download count increments

### Test Copy Link

**Alice copies download link:**
1. Click the **Copy Link** button (clipboard icon)
2. ✅ Alert: "Download link copied to clipboard!"
3. Paste link in new tab
4. ✅ File downloads (link expires in 1 hour)

### Test File Preview

**Bob previews an image:**
1. Click on an image filename
2. ✅ Modal opens with image preview
3. Click X to close

### Test File Deletion

**Alice deletes her file:**
1. Click the **Delete** button (trash icon)
2. Confirm deletion
3. ✅ File disappears from Alice's list
4. ✅ File disappears from Bob's list (real-time)
5. ✅ File deleted from server disk

### Test File Expiration

**Wait 24 hours (or modify expiration for testing):**
1. Files older than 24 hours are auto-deleted
2. Cron job runs every hour
3. ✅ Expired files removed from disk and database
4. ✅ All users notified via socket

---

## File Types & Icons

| Type | Icon Color | Extensions |
|------|-----------|------------|
| PDF | 🔴 Red | .pdf |
| Document | 🔵 Blue | .doc, .docx |
| Spreadsheet | 🟢 Green | .xls, .xlsx |
| Image | 🟣 Purple | .jpg, .png, .gif |
| Video | 🩷 Pink | .mp4, .webm |

---

## UI Components

### File Panel (Right Sidebar)
- **Header**: Shows file count
- **Upload Zone**: Drag & drop or click
- **Progress Bar**: Shows upload percentage
- **File List**: All files with metadata
- **Actions**: Download, Copy Link, Delete
- **Footer**: Info about limits and expiration

### Control Bar Button
- **Icon**: Document/file icon
- **Location**: Bottom control bar, right side
- **Action**: Toggle file panel open/close

---

## API Testing with Postman/cURL

### Upload File
```bash
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "roomId=test-123"
```

### Get Room Files
```bash
curl -X GET http://localhost:5000/api/files/room/test-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Download URL
```bash
curl -X GET http://localhost:5000/api/files/FILE_ID/download-url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete File
```bash
curl -X DELETE http://localhost:5000/api/files/FILE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Console Logs to Watch

### Backend (Server Console)
```
File cleanup cron job scheduled (runs every hour)
Orphaned file cleanup cron job scheduled (runs daily at 3 AM)
User uploaded file: document.pdf to room test-123
Running file cleanup job...
Found 3 expired files to delete
Deleted file from disk: document-1234567890.pdf
File cleanup completed: 3 deleted, 0 errors
```

### Frontend (Browser Console)
```
File uploaded: { id: '...', originalName: 'document.pdf', ... }
Received file:uploaded event
File deleted: { fileId: '...' }
Received file:deleted event
```

---

## Common Issues & Solutions

### Issue: "File type not allowed"
**Solution**: Only these types are supported:
- Documents: PDF, DOC, DOCX, XLS, XLSX
- Images: JPG, PNG, GIF
- Videos: MP4, WEBM

### Issue: "File size exceeds maximum"
**Solution**: Max file size is 50MB. Compress or split the file.

### Issue: "You are not a member of this room"
**Solution**: Join the room first before uploading files.

### Issue: "Failed to upload file"
**Solution**: 
- Check JWT token is valid
- Check room exists
- Check file size and type
- Check server logs for details

### Issue: Files not appearing
**Solution**:
- Refresh the file panel
- Check socket connection
- Check browser console for errors

### Issue: Download link expired
**Solution**: Links expire after 1 hour. Generate a new link.

---

## Testing Checklist

### Upload Tests
- [ ] Upload PDF file
- [ ] Upload DOCX file
- [ ] Upload XLSX file
- [ ] Upload PNG image
- [ ] Upload JPG image
- [ ] Upload MP4 video
- [ ] Try to upload 60MB file (should fail)
- [ ] Try to upload .exe file (should fail)
- [ ] Upload progress bar works
- [ ] File appears in list after upload

### Download Tests
- [ ] Download PDF file
- [ ] Download image file
- [ ] Download video file
- [ ] Copy download link
- [ ] Paste link in new tab (should download)
- [ ] Try expired link (should fail)

### Real-time Tests
- [ ] User A uploads → User B sees instantly
- [ ] User A deletes → User B sees removal instantly
- [ ] Multiple users see same file list

### Permission Tests
- [ ] Non-member cannot upload to room
- [ ] Non-member cannot see room files
- [ ] Only uploader can delete their file
- [ ] Room owner can delete any file

### UI Tests
- [ ] File panel opens/closes
- [ ] Drag & drop works
- [ ] Click to upload works
- [ ] File icons display correctly
- [ ] File metadata displays correctly
- [ ] Empty state shows when no files
- [ ] Error messages display
- [ ] Image preview modal works

### Cleanup Tests
- [ ] Files expire after 24 hours
- [ ] Cron job runs every hour
- [ ] Expired files deleted from disk
- [ ] Expired files deleted from database
- [ ] Users notified when files expire

---

## Performance Tips

### For Large Files
- Use wired connection (not WiFi)
- Close other applications
- Upload during off-peak hours

### For Many Files
- Upload one at a time
- Wait for each upload to complete
- Monitor server disk space

### For Slow Networks
- Compress files before upload
- Use lower quality for images/videos
- Consider splitting large files

---

## Security Notes

✅ **Implemented:**
- JWT authentication required
- Room membership validation
- File type validation
- File size limits
- Filename sanitization
- Signed download URLs
- One-time use tokens
- Automatic file expiration

⚠️ **Production Recommendations:**
- Add virus scanning (ClamAV)
- Use AWS S3 for file storage
- Implement rate limiting
- Add file encryption at rest
- Enable HTTPS only
- Add audit logging
- Implement file quotas

---

## Next Steps After Testing

1. **Migrate to Cloud Storage** (AWS S3, Azure Blob)
2. **Add PDF Preview** (react-pdf library)
3. **Add Video Player** (video.js or react-player)
4. **Implement File Search**
5. **Add File Categories/Tags**
6. **Enable Batch Upload**
7. **Add Download All as ZIP**
8. **Implement File Versioning**

---

## Support

If you encounter issues:
1. Check server logs: `server/` terminal
2. Check browser console: F12 → Console
3. Check network tab: F12 → Network
4. Verify JWT token is valid
5. Verify room membership
6. Check file type and size

---

**Implementation Status: ✅ COMPLETE**

All features are implemented and ready for testing!

**Time to test:** ~10 minutes for full test suite
