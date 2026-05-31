const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateRoomId } = require('../middleware/inputValidation');
const {
  getWhiteboardState,
  saveWhiteboardState,
  clearWhiteboard
} = require('../controllers/whiteboardController');

// All routes require authentication
router.use(protect);

// Get whiteboard state
router.get('/:roomId', validateRoomId, getWhiteboardState);

// Save whiteboard state
router.post('/:roomId/save', validateRoomId, saveWhiteboardState);

// Clear whiteboard
router.post('/:roomId/clear', validateRoomId, clearWhiteboard);

module.exports = router;
