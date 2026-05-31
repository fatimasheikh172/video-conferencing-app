const Room = require('../models/Room');
const { logRoomEvent } = require('../utils/auditLogger');

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private
const createRoom = async (req, res, next) => {
  try {
    const { name, maxParticipants, password, isPrivate, requiresApproval, description } = req.body;

    // Generate unique room ID
    let roomId;
    let isUnique = false;

    while (!isUnique) {
      roomId = Room.generateRoomId();
      const existingRoom = await Room.findOne({ roomId });
      if (!existingRoom) {
        isUnique = true;
      }
    }

    // Create room
    const room = await Room.create({
      roomId,
      name,
      description: description || '',
      host: req.user.id,
      createdBy: req.user.id,
      maxParticipants: maxParticipants || 10,
      isPrivate: isPrivate || false,
      password: password || undefined,
      requiresApproval: requiresApproval || false,
      participants: [{
        user: req.user.id,
        role: 'host',
        joinedAt: new Date()
      }],
      status: 'active',
      startedAt: new Date()
    });

    await room.populate('host', 'name email avatar');
    await room.populate('participants.user', 'name email avatar');

    // Log room creation
    await logRoomEvent('room.create', req, room._id, {
      roomId: room.roomId,
      roomName: room.name,
      maxParticipants: room.maxParticipants,
      status: 'success'
    });

    res.status(201).json({
      success: true,
      room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get room by ID
// @route   GET /api/rooms/:roomId
// @access  Private
const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name email avatar');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.status(200).json({
      success: true,
      room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active rooms
// @route   GET /api/rooms
// @access  Private
const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ status: 'active' })
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .sort('-createdAt')
      .limit(50);

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join a room
// @route   POST /api/rooms/:roomId/join
// @access  Private
const joinRoom = async (req, res, next) => {
  try {
    const { password } = req.body;
    const room = await Room.findOne({ roomId: req.params.roomId }).select('+password');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.status === 'ended') {
      await logRoomEvent('room.join.failed', req, room._id, {
        roomId: room.roomId,
        reason: 'Room has ended',
        status: 'failure'
      });
      return res.status(400).json({
        success: false,
        message: 'Room has ended'
      });
    }

    // Check if user is kicked
    if (room.isKicked(req.user.id)) {
      await logRoomEvent('room.join.failed', req, room._id, {
        roomId: room.roomId,
        reason: 'User is kicked',
        status: 'failure'
      });
      return res.status(403).json({
        success: false,
        message: 'You have been removed from this room'
      });
    }

    if (room.isLocked) {
      await logRoomEvent('room.join.failed', req, room._id, {
        roomId: room.roomId,
        reason: 'Room is locked',
        status: 'failure'
      });
      return res.status(403).json({
        success: false,
        message: 'Room is locked'
      });
    }

    // Check password for private rooms
    if (room.isPrivate && room.password) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: 'Password required',
          requiresPassword: true
        });
      }

      const isPasswordMatch = await room.comparePassword(password);
      if (!isPasswordMatch) {
        await logRoomEvent('room.join.failed', req, room._id, {
          roomId: room.roomId,
          reason: 'Incorrect password',
          status: 'failure'
        });
        return res.status(401).json({
          success: false,
          message: 'Incorrect password'
        });
      }
    }

    if (room.isFull()) {
      await logRoomEvent('room.join.failed', req, room._id, {
        roomId: room.roomId,
        reason: 'Room is full',
        status: 'failure'
      });
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    // Check if room requires approval (waiting room)
    if (room.requiresApproval && !room.isHost(req.user.id)) {
      const added = room.addToWaitingRoom(req.user.id);

      if (!added) {
        return res.status(400).json({
          success: false,
          message: 'You are already in the waiting room'
        });
      }

      await room.save();

      // Notify host via socket
      const io = req.app.get('io');
      if (io) {
        io.to(room.roomId).emit('waiting-room:request', {
          userId: req.user.id,
          userName: req.user.name,
          userAvatar: req.user.avatar,
          requestedAt: new Date()
        });
      }

      await logRoomEvent('room.waiting-room.join', req, room._id, {
        roomId: room.roomId,
        roomName: room.name,
        status: 'success'
      });

      return res.status(200).json({
        success: true,
        message: 'Added to waiting room. Please wait for host approval.',
        waitingRoom: true
      });
    }

    const added = room.addParticipant(req.user.id);

    if (!added) {
      return res.status(400).json({
        success: false,
        message: 'You are already in this room'
      });
    }

    await room.save();
    await room.populate('host', 'name email avatar');
    await room.populate('participants.user', 'name email avatar');

    // Log room join
    await logRoomEvent('room.join', req, room._id, {
      roomId: room.roomId,
      roomName: room.name,
      participantCount: room.participants.length,
      status: 'success'
    });

    res.status(200).json({
      success: true,
      room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave a room
// @route   POST /api/rooms/:roomId/leave
// @access  Private
const leaveRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    room.removeParticipant(req.user.id);

    // If no participants left, end the room
    if (room.participants.length === 0) {
      room.status = 'ended';
      room.endedAt = new Date();
    }

    await room.save();

    // Log room leave
    await logRoomEvent('room.leave', req, room._id, {
      roomId: room.roomId,
      roomName: room.name,
      participantCount: room.participants.length,
      roomEnded: room.status === 'ended',
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Left room successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End a room (host only)
// @route   DELETE /api/rooms/:roomId
// @access  Private
const endRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is the host
    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can end the room'
      });
    }

    room.status = 'ended';
    room.endedAt = new Date();
    await room.save();

    // Log room end
    await logRoomEvent('room.end', req, room._id, {
      roomId: room.roomId,
      roomName: room.name,
      duration: room.endedAt - room.startedAt,
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Room ended successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoom,
  getRoomById,
  getAllRooms,
  joinRoom,
  leaveRoom,
  endRoom
};
