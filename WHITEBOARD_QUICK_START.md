# Whiteboard - Quick Start Guide

## Installation

### Step 1: Install Frontend Dependencies

```bash
cd client
npm install fabric lucide-react
```

### Step 2: Start the Application

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

---

## Test Drawing Tools

### Test 1: Freehand Drawing

**Alice draws:**
1. Click the **Whiteboard** button (clipboard icon) in control bar
2. Whiteboard opens in fullscreen
3. Select **Pen** tool (pencil icon) - should be active by default
4. Draw on the canvas
5. ✅ Alice sees her drawing
6. ✅ Bob sees Alice's drawing in real-time
7. ✅ Bob sees "Alice is drawing..." indicator

### Test 2: Shapes

**Bob adds shapes:**
1. Select **Rectangle** tool
2. Click on canvas → Rectangle appears
3. Select **Circle** tool
4. Click on canvas → Circle appears
5. ✅ Alice sees Bob's shapes instantly
6. ✅ Shapes are selectable and movable

### Test 3: Colors

**Alice changes colors:**
1. Click the **stroke color** picker (top color box)
2. Select red color
3. Draw with pen → Line is red
4. Click the **fill color** picker (bottom color box)
5. Select blue color
6. Add a rectangle → Rectangle has blue fill and red stroke
7. ✅ Bob sees colored shapes

### Test 4: Brush Size

**Bob changes brush size:**
1. Use the **brush size slider** (vertical slider)
2. Move to 10px
3. Draw with pen → Thicker line
4. ✅ Alice sees thicker line

### Test 5: Text

**Alice adds text:**
1. Select **Text** tool (T icon)
2. Click on canvas
3. Type "Hello World"
4. Click outside to finish
5. ✅ Bob sees the text
6. ✅ Text is editable by clicking on it

### Test 6: Select & Move

**Bob moves objects:**
1. Select **Select** tool (pointer icon)
2. Click on any shape
3. Drag to move it
4. Resize using corner handles
5. ✅ Alice sees the movement in real-time

### Test 7: Undo/Redo

**Alice tests undo:**
1. Draw something
2. Press **Ctrl+Z** (or click Undo button)
3. ✅ Last action is undone
4. Press **Ctrl+Y** (or click Redo button)
5. ✅ Action is redone
6. ✅ Bob sees the undo/redo effects

### Test 8: Clear All

**Bob clears whiteboard:**
1. Click **Clear** button (trash icon)
2. Confirm the dialog
3. ✅ Canvas is cleared for both users
4. ✅ Alice sees empty canvas

### Test 9: Download

**Alice downloads whiteboard:**
1. Click **Download** button
2. ✅ PNG file downloads
3. ✅ File contains all drawings

### Test 10: Remote Cursors

**Both users move mouse:**
1. Move mouse on canvas
2. ✅ Alice sees Bob's cursor with his name
3. ✅ Bob sees Alice's cursor with her name
4. ✅ Cursors are color-coded
5. ✅ Cursors move in real-time

### Test 11: Persistence

**Alice leaves and rejoins:**
1. Alice draws something
2. Alice closes whiteboard
3. Alice leaves room
4. Alice rejoins room
5. Alice opens whiteboard
6. ✅ Previous drawings are still there
7. ✅ Auto-save worked (30 seconds)

---

## Tool Reference

### Drawing Tools

| Icon | Tool | Shortcut | Description |
|------|------|----------|-------------|
| 🖱️ | Select | - | Select and move objects |
| ✏️ | Pen | - | Freehand drawing |
| ⬜ | Rectangle | - | Draw rectangles |
| ⭕ | Circle | - | Draw circles |
| 🔺 | Triangle | - | Draw triangles |
| ➖ | Line | - | Draw straight lines |
| ➡️ | Arrow | - | Draw arrows |
| T | Text | - | Add text |
| 🧹 | Eraser | - | Remove objects |

### Actions

| Icon | Action | Shortcut | Description |
|------|--------|----------|-------------|
| ↶ | Undo | Ctrl+Z | Undo last action |
| ↷ | Redo | Ctrl+Y | Redo undone action |
| 🗑️ | Clear | - | Clear entire canvas |
| 💾 | Download | - | Export as PNG |

### Color Controls

- **Top color box**: Stroke color (outline)
- **Bottom color box**: Fill color (inside)
- **Slider**: Brush size (1-20px)

---

## Common Workflows

### Workflow 1: Brainstorming Session

1. Alice opens whiteboard
2. Alice draws mind map with pen
3. Bob adds shapes for categories
4. Alice adds text labels
5. Both users move elements around
6. Download final result

### Workflow 2: Diagram Creation

1. Bob draws flowchart with shapes
2. Alice adds arrows to connect
3. Bob adds text labels
4. Alice changes colors for clarity
5. Download as PNG

### Workflow 3: Teaching/Presentation

1. Teacher opens whiteboard
2. Teacher draws diagrams
3. Students see in real-time
4. Students can ask to draw (take turns)
5. Save for later reference

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+Shift+Z | Redo (alternative) |
| Esc | Deselect object |

---

## Tips & Tricks

### Drawing Tips
- Hold Shift while drawing line → Straight horizontal/vertical
- Hold Shift while resizing → Maintain aspect ratio
- Double-click text to edit
- Click outside text to finish editing

### Performance Tips
- Clear canvas periodically for better performance
- Limit number of objects (< 1000 recommended)
- Use simpler shapes for complex diagrams
- Download and start fresh if canvas gets slow

### Collaboration Tips
- Communicate who's drawing to avoid conflicts
- Use different colors per person
- Take turns for complex edits
- Use text tool for annotations
- Download frequently to save progress

---

## Troubleshooting

### Issue: Whiteboard button not visible
**Solution**: Check if you're in a room. Button only appears in video room.

### Issue: Canvas is blank
**Solution**: 
- Check if Fabric.js loaded (browser console)
- Refresh the page
- Check socket connection

### Issue: Drawings not syncing
**Solution**:
- Check socket connection (look for "Socket connected" in console)
- Verify both users are in same room
- Check network connection

### Issue: Can't see remote cursors
**Solution**:
- Check if other user is moving mouse
- Verify socket events in browser console
- Refresh the page

### Issue: Undo/Redo not working
**Solution**:
- Check if there's history (draw something first)
- Try keyboard shortcuts (Ctrl+Z/Y)
- Check browser console for errors

### Issue: Auto-save not working
**Solution**:
- Check MongoDB connection
- Verify room membership
- Check server logs

### Issue: Download not working
**Solution**:
- Check browser permissions
- Try different browser
- Check console for errors

---

## Browser Console Commands

### Check Fabric.js Version
```javascript
console.log(fabric.version);
```

### Get Canvas State
```javascript
const canvas = fabricCanvasRef.current;
console.log(canvas.toJSON());
```

### Count Objects
```javascript
const canvas = fabricCanvasRef.current;
console.log('Objects:', canvas.getObjects().length);
```

### Clear Canvas Programmatically
```javascript
const canvas = fabricCanvasRef.current;
canvas.clear();
canvas.backgroundColor = '#ffffff';
canvas.renderAll();
```

---

## Performance Benchmarks

### Canvas Size
- Small (800x600): Excellent performance
- Medium (1920x1080): Good performance
- Large (3840x2160): May lag with many objects

### Object Count
- < 100 objects: Excellent
- 100-500 objects: Good
- 500-1000 objects: Fair
- > 1000 objects: May lag

### Network Latency
- < 50ms: Real-time sync
- 50-100ms: Slight delay
- 100-200ms: Noticeable delay
- > 200ms: Significant delay

---

## Testing Checklist

### Drawing Tests
- [ ] Freehand drawing works
- [ ] Rectangle tool works
- [ ] Circle tool works
- [ ] Triangle tool works
- [ ] Line tool works
- [ ] Arrow tool works
- [ ] Text tool works
- [ ] Eraser tool works

### Color Tests
- [ ] Stroke color changes
- [ ] Fill color changes
- [ ] Custom hex colors work
- [ ] Colors sync to other users

### Size Tests
- [ ] Brush size slider works
- [ ] Size 1px works
- [ ] Size 20px works
- [ ] Size syncs to other users

### Selection Tests
- [ ] Select tool works
- [ ] Objects can be moved
- [ ] Objects can be resized
- [ ] Objects can be rotated
- [ ] Changes sync to other users

### History Tests
- [ ] Undo works (Ctrl+Z)
- [ ] Redo works (Ctrl+Y)
- [ ] History limited to 50 steps
- [ ] Undo/redo syncs to other users

### Clear Tests
- [ ] Clear button works
- [ ] Confirmation dialog appears
- [ ] Canvas clears for all users
- [ ] History resets

### Download Tests
- [ ] PNG download works
- [ ] Filename includes room ID
- [ ] Downloaded image is correct
- [ ] All objects included

### Multi-User Tests
- [ ] Remote cursors visible
- [ ] Cursor names displayed
- [ ] Cursors color-coded
- [ ] Drawing indicator works
- [ ] Real-time sync works
- [ ] No conflicts

### Persistence Tests
- [ ] Auto-save every 30 seconds
- [ ] State loads on rejoin
- [ ] All objects restored
- [ ] Properties preserved

---

## Demo Script

**For a quick 5-minute demo:**

1. **Setup** (30 seconds)
   - Open two browser windows
   - Login as two users
   - Join same room

2. **Drawing** (1 minute)
   - User 1: Draw with pen
   - User 2: Add shapes
   - Show real-time sync

3. **Colors** (30 seconds)
   - User 1: Change colors
   - User 2: See colored objects

4. **Text** (30 seconds)
   - User 1: Add text
   - User 2: Edit text

5. **Move** (30 seconds)
   - User 2: Move objects
   - User 1: See movement

6. **Cursors** (30 seconds)
   - Both: Move mouse
   - Show cursor tracking

7. **Undo/Redo** (30 seconds)
   - User 1: Undo/redo
   - User 2: See changes

8. **Download** (30 seconds)
   - User 1: Download PNG
   - Show saved file

9. **Persistence** (1 minute)
   - User 1: Leave and rejoin
   - Show restored state

**Total time:** ~5 minutes

---

## Success Criteria

✅ All drawing tools work  
✅ Colors and sizes customizable  
✅ Real-time sync works  
✅ Remote cursors visible  
✅ Undo/redo functional  
✅ Clear and download work  
✅ Auto-save and persistence work  
✅ Multi-user collaboration smooth  
✅ No conflicts or data loss  
✅ Performance acceptable  

---

## Next Steps After Testing

1. **Optimize Performance**
   - Throttle cursor updates
   - Batch object updates
   - Implement lazy loading

2. **Add Features**
   - PDF export with jsPDF
   - Image upload
   - More shapes
   - Zoom/pan

3. **Improve UX**
   - Keyboard shortcuts for tools
   - Tool presets
   - Color palette presets
   - Templates

4. **Enhance Collaboration**
   - Show who's editing what
   - Lock objects
   - Permissions (view-only mode)
   - Comments/annotations

---

**Implementation Status: ✅ COMPLETE**

All features are implemented and ready for testing!

**Time to test:** ~15 minutes for full test suite
