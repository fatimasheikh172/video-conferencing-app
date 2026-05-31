const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate, validateRoomId } = require('../middleware/inputValidation');
const {
  getRoomMessages,
  getDMMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  removeReaction,
  markAsRead,
  searchMessages,
  getUnreadCount
} = require('../controllers/chatController');

// All routes require authentication
router.use(protect);

// Room messages
router.get('/room/:roomId', validateRoomId, getRoomMessages);
router.get('/room/:roomId/search', validateRoomId, searchMessages);
router.get('/room/:roomId/unread', validateRoomId, getUnreadCount);

// DM messages
router.get('/dm/:userId', getDMMessages);

// Send message
router.post('/send', validate('sendMessage'), sendMessage);

// Message actions
router.put('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/react', reactToMessage);
router.delete('/:messageId/react', removeReaction);
router.post('/:messageId/read', markAsRead);

module.exports = router;
