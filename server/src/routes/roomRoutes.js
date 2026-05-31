const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRoomById,
  getAllRooms,
  joinRoom,
  leaveRoom,
  endRoom
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');
const { validate, validateRoomId } = require('../middleware/inputValidation');
const { roomCreationLimiter } = require('../middleware/rateLimiter');

router.post('/', protect, roomCreationLimiter, validate('createRoom'), createRoom);
router.get('/', protect, getAllRooms);
router.get('/:roomId', protect, validateRoomId, getRoomById);
router.post('/:roomId/join', protect, validateRoomId, validate('joinRoom'), joinRoom);
router.post('/:roomId/leave', protect, validateRoomId, leaveRoom);
router.delete('/:roomId', protect, validateRoomId, endRoom);

module.exports = router;
