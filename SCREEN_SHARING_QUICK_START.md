# Screen Sharing - Quick Start Guide

## How to Test Screen Sharing

### 1. Start the Application

**Terminal 1 - Start Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Start Frontend:**
```bash
cd client
npm start
```

### 2. Test Scenario: Two Users in a Room

#### Setup:
1. Open browser window 1: `http://localhost:3000`
2. Register/Login as User 1 (e.g., "Alice")
3. Join or create a room (e.g., `/room/test-123`)

4. Open browser window 2 (or incognito): `http://localhost:3000`
5. Register/Login as User 2 (e.g., "Bob")
6. Join the same room: `/room/test-123`

#### Test Screen Sharing:

**User 1 (Alice) shares screen:**
1. Click the screen share button (monitor icon) in the control bar
2. Select quality: 720p (Medium)
3. Browser shows screen picker → Select screen/window/tab
4. ✅ Alice's video tile shows red "SCREEN SHARING" badge
5. ✅ Banner appears: "You are sharing your screen"
6. ✅ Screen share button turns blue

**User 2 (Bob) views screen share:**
1. ✅ Bob sees banner: "Alice is sharing their screen"
2. ✅ Alice's video tile shows red "SCREEN SHARING" badge
3. ✅ Bob's screen share button is disabled (gray)
4. Hover over Alice's video → Fullscreen and PiP buttons appear
5. Click fullscreen → Alice's screen fills the entire screen
6. Press ESC to exit fullscreen
7. Click PiP → Alice's screen pops out to floating window

**Stop screen sharing:**
1. Alice clicks screen share button again (or browser's "Stop Sharing")
2. ✅ Camera restores automatically
3. ✅ Banner disappears for both users
4. ✅ Red badge disappears
5. ✅ Bob's screen share button becomes enabled

### 3. Test Edge Cases

#### Permission Denied:
1. Click screen share button
2. Click "Cancel" in browser picker
3. ✅ Error notification appears: "Screen sharing permission denied"
4. ✅ No state change, can try again

#### Someone Else Sharing:
1. Alice is sharing screen
2. Bob clicks screen share button
3. ✅ Button is disabled with tooltip: "Alice is sharing"
4. ✅ No action taken

#### Browser Stop Button:
1. Alice starts screen sharing
2. Click browser's native "Stop Sharing" button (in address bar)
3. ✅ Camera restores automatically
4. ✅ All users notified
5. ✅ Clean state for everyone

#### Leave While Sharing:
1. Alice starts screen sharing
2. Alice clicks "Leave" button
3. ✅ Screen share stops
4. ✅ Bob's button becomes enabled
5. ✅ Clean state

### 4. Quality Testing

Test different quality settings:

**1080p (High Quality):**
- Best for presentations with text
- Requires good network (2-4 Mbps)
- Higher CPU usage

**720p (Medium Quality) - Recommended:**
- Good balance of quality and performance
- Works on most networks (1-2 Mbps)
- Default option

**480p (Low Quality):**
- For poor network conditions
- Lower CPU usage
- Still readable for most content

### 5. Browser Compatibility

Test in different browsers:
- ✅ Chrome/Edge (best support)
- ✅ Firefox (full support)
- ✅ Safari 13+ (full support)

### 6. Expected Behavior

#### Visual Indicators:
- 🔴 Red "SCREEN SHARING" badge with pulsing dot
- 🔵 Blue screen share button when active
- ⚫ Gray screen share button when disabled
- 📢 Banner showing who is sharing

#### Video Display:
- Screen shares use "object-contain" (no cropping)
- Camera videos use "object-cover" (fills tile)
- Smooth transition when starting/stopping

#### Controls:
- Fullscreen button (appears on hover)
- Picture-in-picture button (appears on hover)
- Quality selector dropdown
- Stop sharing button

### 7. Troubleshooting

**Screen share button doesn't work:**
- Check HTTPS (required for getDisplayMedia)
- Check browser permissions
- Try refreshing the page

**Viewers see black screen:**
- Check if screen share is still active
- Try stopping and restarting
- Check network connection

**Camera doesn't restore:**
- Refresh the page
- Check camera permissions
- Rejoin the room

**Laggy screen share:**
- Lower quality to 480p
- Check network bandwidth
- Close other applications

### 8. Console Logs to Watch

Open browser DevTools → Console to see:
```
User started screen sharing in room test-123
Screen share started by Alice
Received stream from peer: user-123
Screen share stopped by user user-123
```

### 9. Network Tab (Optional)

Check WebRTC stats:
1. Open DevTools → Console
2. Type: `webrtcService.getConnectionStats('peer-id')`
3. See bandwidth, packet loss, quality metrics

---

## Feature Checklist

Test all features:
- [ ] Start screen share with quality selector
- [ ] Stop screen share via button
- [ ] Stop screen share via browser UI
- [ ] View screen share in fullscreen
- [ ] View screen share in picture-in-picture
- [ ] Single sharer enforcement (second user blocked)
- [ ] Screen share indicator visible to all
- [ ] Camera restores after stopping
- [ ] Error handling (permission denied)
- [ ] Leave room while sharing (auto-cleanup)
- [ ] Banner shows correct user name
- [ ] Button states update correctly

---

## Demo Script

**For a quick demo:**

1. Open two browser windows side-by-side
2. Login as two different users
3. Join the same room
4. User 1: Click screen share → Select 720p → Share screen
5. User 2: See the screen share with banner
6. User 2: Click fullscreen on User 1's video
7. User 1: Stop sharing
8. Both users: Verify camera restored and UI updated

**Expected time:** 2-3 minutes

---

## Success Criteria

✅ Screen sharing works smoothly  
✅ Only one person can share at a time  
✅ Visual indicators are clear  
✅ Fullscreen and PiP work  
✅ Auto-stop detection works  
✅ Camera restores correctly  
✅ Error handling is graceful  
✅ All participants see the same state  

---

## Next Steps

After testing, you can:
1. Adjust quality presets in `webrtc.js`
2. Customize UI colors/styles
3. Add screen share recording
4. Add annotation tools
5. Implement spotlight mode
6. Add screen share analytics

---

**Implementation Status: ✅ COMPLETE**

All features are implemented and ready for testing!
