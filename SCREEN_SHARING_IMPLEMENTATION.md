# Screen Sharing Implementation

## Overview
Complete screen sharing feature for the WebRTC video conferencing app with quality selection, fullscreen viewing, picture-in-picture support, and single-sharer enforcement.

---

## Features Implemented

### 1. **Screen Capture with Quality Options**
- **API**: `getDisplayMedia()` with configurable quality presets
- **Quality Options**:
  - 1080p (1920x1080, 30fps) - High quality
  - 720p (1280x720, 30fps) - Medium quality (default)
  - 480p (854x480, 24fps) - Low quality
- **Browser Support Check**: Graceful error handling for unsupported browsers
- **User Controls**: Share entire screen, specific window, or browser tab

### 2. **Dynamic Track Replacement**
- Seamlessly replaces video track in all active peer connections
- Maintains audio track during screen sharing
- Automatic restoration of camera when screen share stops
- No reconnection required - uses `RTCRtpSender.replaceTrack()`

### 3. **Single Sharer Enforcement**
- **Server-side validation**: Only one person can share at a time
- **Visual feedback**: Disabled button when someone else is sharing
- **Request system**: Users can request to share (notifies current sharer)
- **Automatic cleanup**: Screen share stops when user leaves room

### 4. **Auto-Stop Detection**
- Listens for browser's native "Stop Sharing" button
- Automatically cleans up and restores camera
- Notifies all participants via Socket.io
- Prevents orphaned screen share state

### 5. **Visual Indicators**
- **Red badge** on video tile: "SCREEN SHARING" with pulsing dot
- **Banner notification**: Shows who is currently sharing
- **Button states**: Blue when sharing, gray when disabled
- **Error notifications**: Toast-style messages for failures

### 6. **Viewer Features**
- **Fullscreen mode**: Click fullscreen button on any video tile
- **Picture-in-picture**: Pop out video to floating window
- **Object-fit**: Screen shares use "contain" (no cropping)
- **Hover controls**: Buttons appear on mouse hover

---

## Socket.io Events

### Client → Server

#### `screenshare:start`
```javascript
socket.emit('screenshare:start', { roomId });
```
Notifies server that user started screen sharing.

**Server Response**:
- Success: Broadcasts `screenshare:started` to all users
- Failure: Emits `screenshare:error` if someone else is sharing

#### `screenshare:stop`
```javascript
socket.emit('screenshare:stop', { roomId });
```
Notifies server that user stopped screen sharing.

**Server Response**: Broadcasts `screenshare:stopped` to all users

#### `screenshare:request`
```javascript
socket.emit('screenshare:request', { roomId });
```
Requests permission to share when someone else is sharing.

**Server Response**: Sends `screenshare:request-received` to current sharer

---

### Server → Client

#### `screenshare:started`
```javascript
socket.on('screenshare:started', ({ userId, userName }) => {
  // Update UI to show who is sharing
});
```

#### `screenshare:stopped`
```javascript
socket.on('screenshare:stopped', ({ userId }) => {
  // Clear screen share indicator
});
```

#### `screenshare:error`
```javascript
socket.on('screenshare:error', ({ message }) => {
  // Display error notification
});
```

#### `screenshare:request-received`
```javascript
socket.on('screenshare:request-received', ({ userId, userName }) => {
  // Notify current sharer that someone wants to share
});
```

---

## Code Structure

### Backend Files

#### `server/src/socket/webrtcHandlers.js`
- Added `screenshare:start` event handler
- Added `screenshare:stop` event handler
- Added `screenshare:request` event handler
- Single-sharer validation logic
- Room state tracking with `isScreenSharing` flag

### Frontend Files

#### `client/src/services/webrtc.js`
**New Methods**:
- `getDisplayMedia(quality)` - Capture screen with quality preset
- `startScreenShare(quality)` - Start sharing and replace tracks
- `stopScreenShare(cameraStream)` - Stop sharing and restore camera
- `replaceVideoTrack(newStream, isScreenShare)` - Replace track in all peers
- `setScreenShareEndedCallback(callback)` - Handle browser stop button

#### `client/src/hooks/useWebRTC.js`
**New State**:
- `isScreenSharing` - Boolean, true if local user is sharing
- `screenShareUser` - Object `{ userId, userName }` of current sharer
- `screenShareError` - String, error message if share fails

**New Functions**:
- `startScreenShare(quality)` - Initiate screen sharing
- `stopScreenShare()` - Stop screen sharing
- `requestScreenShare()` - Request to share when blocked

**New Socket Listeners**:
- `screenshare:started`
- `screenshare:stopped`
- `screenshare:error`
- `screenshare:request-received`

#### `client/src/components/Video/ControlBar.jsx`
**New Props**:
- `isScreenSharing` - Boolean
- `onToggleScreenShare(start, quality)` - Callback
- `screenShareUser` - Object or null

**New UI**:
- Screen share button with icon
- Quality selector dropdown (1080p/720p/480p)
- Disabled state when someone else is sharing
- Visual feedback (blue when active)

#### `client/src/components/Video/VideoTile.jsx`
**New Props**:
- `isScreenSharing` - Boolean

**New Features**:
- Red "SCREEN SHARING" badge with pulsing dot
- Fullscreen button (appears on hover)
- Picture-in-picture button (appears on hover)
- Object-fit changes to "contain" for screen shares
- Fullscreen state management

#### `client/src/components/Video/VideoRoom.jsx`
**New Features**:
- Screen share indicator banner at top
- Error notification toast
- Integration with useWebRTC hook
- Passes screen share props to child components

---

## Error Handling

### Permission Denied
```
Error: "Screen sharing permission denied"
```
**Cause**: User clicked "Cancel" in browser permission dialog  
**Handling**: Display error notification, don't change state

### Browser Not Supported
```
Error: "Screen sharing is not supported in this browser"
```
**Cause**: Browser doesn't support `getDisplayMedia()`  
**Handling**: Display error, suggest modern browser

### Someone Else Sharing
```
Error: "John is already sharing their screen"
```
**Cause**: Another user is currently sharing  
**Handling**: Disable button, show who is sharing

### Track Ended Unexpectedly
**Cause**: User closed browser's native "Stop Sharing" button  
**Handling**: Auto-cleanup via `onended` event listener, restore camera

### Network Failure
**Cause**: Socket disconnection during screen share  
**Handling**: Reconnection logic in useWebRTC hook

---

## Usage Example

### Starting Screen Share
```javascript
// User clicks "Share Screen" button
// Selects quality: 720p
await startScreenShare('720p');

// Browser shows screen picker
// User selects screen/window/tab
// Video track is replaced in all peer connections
// Server notified, all participants see banner
```

### Stopping Screen Share
```javascript
// User clicks "Stop Sharing" button
await stopScreenShare();

// Camera stream is restored
// Server notified, banner disappears
```

### Viewer Experience
```javascript
// Sees banner: "John is sharing their screen"
// Video tile shows red "SCREEN SHARING" badge
// Hover over video → Fullscreen and PiP buttons appear
// Click fullscreen → Video expands to full screen
// Click PiP → Video pops out to floating window
```

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Screen Sharing | ✅ | ✅ | ✅ 13+ | ✅ |
| Quality Selection | ✅ | ✅ | ⚠️ Limited | ✅ |
| Picture-in-Picture | ✅ | ✅ | ✅ | ✅ |
| Fullscreen API | ✅ | ✅ | ✅ | ✅ |

---

## Testing Checklist

- [ ] Start screen share with 1080p quality
- [ ] Start screen share with 720p quality
- [ ] Start screen share with 480p quality
- [ ] Stop screen share via button
- [ ] Stop screen share via browser's native button
- [ ] Try to share when someone else is sharing (should be blocked)
- [ ] View screen share in fullscreen mode
- [ ] View screen share in picture-in-picture mode
- [ ] Cancel permission dialog (should show error)
- [ ] Leave room while screen sharing (should auto-stop)
- [ ] Disconnect during screen share (should handle gracefully)
- [ ] Multiple viewers see screen share simultaneously
- [ ] Screen share indicator appears for all participants
- [ ] Camera restores correctly after stopping

---

## Performance Considerations

1. **Quality vs Bandwidth**: Higher quality = more bandwidth
   - 1080p: ~2-4 Mbps
   - 720p: ~1-2 Mbps
   - 480p: ~0.5-1 Mbps

2. **CPU Usage**: Screen capture is CPU-intensive
   - Recommend 720p for most users
   - 480p for low-end devices or poor networks

3. **Track Replacement**: No reconnection needed
   - Uses `replaceTrack()` API
   - Seamless transition for viewers
   - No interruption to audio

---

## Future Enhancements

- [ ] Audio sharing (system audio with screen)
- [ ] Screen share recording
- [ ] Annotation tools (draw on screen share)
- [ ] Spotlight mode (screen share takes full screen for all)
- [ ] Screen share permissions (host-only mode)
- [ ] Bandwidth adaptation (auto-adjust quality)
- [ ] Screen share analytics (duration, quality metrics)

---

## Security Notes

- Screen sharing requires user permission (browser enforced)
- No server-side access to screen content
- Peer-to-peer transmission (end-to-end)
- HTTPS required for `getDisplayMedia()`
- Users can stop sharing anytime via browser UI

---

## Troubleshooting

### Screen share button is disabled
**Solution**: Someone else is currently sharing. Wait for them to stop.

### "Permission denied" error
**Solution**: Check browser permissions, reload page, try again.

### Screen share is laggy
**Solution**: Lower quality to 480p, check network connection.

### Camera doesn't restore after stopping
**Solution**: Refresh page, check camera permissions.

### Viewers see black screen
**Solution**: Check if screen share is still active, try stopping and restarting.

---

## Implementation Complete ✅

All requested features have been implemented:
- ✅ getDisplayMedia() API for screen capture
- ✅ Dynamic track replacement in all peer connections
- ✅ Share entire screen OR specific window OR browser tab
- ✅ Screen share indicator (red badge) visible to all participants
- ✅ Auto-stop when user closes browser's native share dialog
- ✅ Restore camera when screen share stops
- ✅ Only ONE person can share screen at a time (enforced via Socket.io)
- ✅ Screen share viewer gets fullscreen option
- ✅ Picture-in-picture support
- ✅ Screen share quality selector (1080p/720p/480p)
- ✅ Complete error handling
- ✅ Socket.io events (screenshare:start, screenshare:stop, screenshare:request)
