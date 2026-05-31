const Room = require('../models/Room');
const User = require('../models/User');
const SOCKET_EVENTS = require('./events');
const { logRoomEvent } = require('../utils/auditLogger');

// Store active rooms and their socket connections
const activeRooms = new Map();

const handleSocketEvents = (io, socket) => {
  // Join room
  socket.on(SOCKET_EVENTS.JOIN_ROOM, async ({ roomId, userName }) => {
    try {
      const room = await Room.findOne({ roomId })
        .populate('participants.user', 'name email avatar');

      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room not found' });
        return;
      }

      // Join socket room
      socket.join(roomId);
      socket.currentRoom = roomId;

      // Store user info in active rooms
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
      }

      const roomUsers = activeRooms.get(roomId);
      roomUsers.set(socket.userId, {
        socketId: socket.id,
        userId: socket.userId,
        userName: userName || socket.userEmail,
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false
      });

      // Get all users in the room
      const usersInRoom = Array.from(roomUsers.values());

      // Notify others that a new user joined
      socket.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
        userId: socket.userId,
        userName: userName || socket.userEmail,
        socketId: socket.id
      });

      // Send current room users to the new user
      socket.emit(SOCKET_EVENTS.ROOM_USERS, usersInRoom);

      console.log(`User ${socket.userId} joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join room' });
    }
  });

  // Leave room
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, ({ roomId }) => {
    handleLeaveRoom(io, socket, roomId);
  });

  // WebRTC signaling - Offer
  socket.on(SOCKET_EVENTS.OFFER, ({ offer, to }) => {
    socket.to(to).emit(SOCKET_EVENTS.OFFER, {
      offer,
      from: socket.id,
      userId: socket.userId
    });
  });

  // WebRTC signaling - Answer
  socket.on(SOCKET_EVENTS.ANSWER, ({ answer, to }) => {
    socket.to(to).emit(SOCKET_EVENTS.ANSWER, {
      answer,
      from: socket.id,
      userId: socket.userId
    });
  });

  // WebRTC signaling - ICE Candidate
  socket.on(SOCKET_EVENTS.ICE_CANDIDATE, ({ candidate, to }) => {
    socket.to(to).emit(SOCKET_EVENTS.ICE_CANDIDATE, {
      candidate,
      from: socket.id,
      userId: socket.userId
    });
  });

  // Toggle audio
  socket.on(SOCKET_EVENTS.TOGGLE_AUDIO, ({ roomId, isEnabled }) => {
    const roomUsers = activeRooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.userId)) {
      const user = roomUsers.get(socket.userId);
      user.isAudioEnabled = isEnabled;

      socket.to(roomId).emit(SOCKET_EVENTS.USER_MEDIA_STATE, {
        userId: socket.userId,
        isAudioEnabled: isEnabled
      });
    }
  });

  // Toggle video
  socket.on(SOCKET_EVENTS.TOGGLE_VIDEO, ({ roomId, isEnabled }) => {
    const roomUsers = activeRooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.userId)) {
      const user = roomUsers.get(socket.userId);
      user.isVideoEnabled = isEnabled;

      socket.to(roomId).emit(SOCKET_EVENTS.USER_MEDIA_STATE, {
        userId: socket.userId,
        isVideoEnabled: isEnabled
      });
    }
  });

  // Send message
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, ({ roomId, message }) => {
    const timestamp = new Date();

    io.to(roomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, {
      userId: socket.userId,
      userName: socket.userEmail,
      message: message.trim(),
      timestamp
    });
  });

  // Start screen share
  socket.on(SOCKET_EVENTS.START_SCREEN_SHARE, ({ roomId }) => {
    const roomUsers = activeRooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.userId)) {
      const user = roomUsers.get(socket.userId);
      user.isScreenSharing = true;

      socket.to(roomId).emit(SOCKET_EVENTS.START_SCREEN_SHARE, {
        userId: socket.userId,
        socketId: socket.id
      });
    }
  });

  // Stop screen share
  socket.on(SOCKET_EVENTS.STOP_SCREEN_SHARE, ({ roomId }) => {
    const roomUsers = activeRooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.userId)) {
      const user = roomUsers.get(socket.userId);
      user.isScreenSharing = false;

      socket.to(roomId).emit(SOCKET_EVENTS.STOP_SCREEN_SHARE, {
        userId: socket.userId
      });
    }
  });

  // Kick user (host/moderator only)
  socket.on('room:kick-user', async ({ roomId, targetUserId, reason }) => {
    try {
      const room = await Room.findOne({ roomId });

      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room not found' });
        return;
      }

      // Check if requester is host or moderator
      if (!room.isHost(socket.userId) && !room.isModerator(socket.userId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only host or moderators can kick users' });
        return;
      }

      // Kick user
      room.kickUser(targetUserId, reason || 'Removed by host');
      await room.save();

      // Get target user's socket
      const roomUsers = activeRooms.get(roomId);
      if (roomUsers && roomUsers.has(targetUserId)) {
        const targetUser = roomUsers.get(targetUserId);

        // Notify kicked user
        io.to(targetUser.socketId).emit('room:kicked', {
          reason: reason || 'Removed by host'
        });

        // Remove from active users
        roomUsers.delete(targetUserId);
      }

      // Notify all participants
      io.to(roomId).emit('room:user-kicked', {
        userId: targetUserId,
        reason: reason || 'Removed by host'
      });

      // Log kick event
      await logRoomEvent('room.kick', { userId: socket.userId }, room._id, {
        roomId: room.roomId,
        targetUserId,
        reason: reason || 'Removed by host',
        status: 'success'
      });

    } catch (error) {
      console.error('Error kicking user:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to kick user' });
    }
  });

  // Approve waiting room user (host only)
  socket.on('room:approve-user', async ({ roomId, targetUserId }) => {
    try {
      const room = await Room.findOne({ roomId });

      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room not found' });
        return;
      }

      // Check if requester is host
      if (!room.isHost(socket.userId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only host can approve users' });
        return;
      }

      // Approve user
      room.approveWaitingUser(targetUserId);
      await room.save();

      // Notify approved user
      const roomUsers = activeRooms.get(roomId);
      if (roomUsers && roomUsers.has(targetUserId)) {
        const targetUser = roomUsers.get(targetUserId);
        io.to(targetUser.socketId).emit('room:approved');
      }

      // Notify all participants
      io.to(roomId).emit('room:user-approved', {
        userId: targetUserId
      });

      // Log approval
      await logRoomEvent('room.waiting-room.approve', { userId: socket.userId }, room._id, {
        roomId: room.roomId,
        targetUserId,
        status: 'success'
      });

    } catch (error) {
      console.error('Error approving user:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to approve user' });
    }
  });

  // Lock room (host only)
  socket.on('room:lock', async ({ roomId }) => {
    try {
      const room = await Room.findOne({ roomId });

      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room not found' });
        return;
      }

      // Check if requester is host
      if (!room.isHost(socket.userId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only host can lock room' });
        return;
      }

      room.isLocked = true;
      await room.save();

      // Notify all participants
      io.to(roomId).emit('room:locked');

      // Log lock event
      await logRoomEvent('room.lock', { userId: socket.userId }, room._id, {
        roomId: room.roomId,
        status: 'success'
      });

    } catch (error) {
      console.error('Error locking room:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to lock room' });
    }
  });

  // Unlock room (host only)
  socket.on('room:unlock', async ({ roomId }) => {
    try {
      const room = await Room.findOne({ roomId });

      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room not found' });
        return;
      }

      // Check if requester is host
      if (!room.isHost(socket.userId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only host can unlock room' });
        return;
      }

      room.isLocked = false;
      await room.save();

      // Notify all participants
      io.to(roomId).emit('room:unlocked');

      // Log unlock event
      await logRoomEvent('room.unlock', { userId: socket.userId }, room._id, {
        roomId: room.roomId,
        status: 'success'
      });

    } catch (error) {
      console.error('Error unlocking room:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to unlock room' });
    }
  });

  // Mute all (host only)
  socket.on('room:mute-all', async ({ roomId }) => {
    try {
      const room = await Room.findOne({ roomId });

      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room not found' });
        return;
      }

      // Check if requester is host
      if (!room.isHost(socket.userId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only host can mute all' });
        return;
      }

      room.muteAll();
      await room.save();

      // Notify all participants
      io.to(roomId).emit('room:mute-all');

      // Log mute all event
      await logRoomEvent('room.mute-all', { userId: socket.userId }, room._id, {
        roomId: room.roomId,
        status: 'success'
      });

    } catch (error) {
      console.error('Error muting all:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to mute all' });
    }
  });

  // Unmute all (host only)
  socket.on('room:unmute-all', async ({ roomId }) => {
    try {
      const room = await Room.findOne({ roomId });

      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room not found' });
        return;
      }

      // Check if requester is host
      if (!room.isHost(socket.userId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only host can unmute all' });
        return;
      }

      room.unmuteAll();
      await room.save();

      // Notify all participants
      io.to(roomId).emit('room:unmute-all');

      // Log unmute all event
      await logRoomEvent('room.unmute-all', { userId: socket.userId }, room._id, {
        roomId: room.roomId,
        status: 'success'
      });

    } catch (error) {
      console.error('Error unmuting all:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to unmute all' });
    }
  });

  // Handle disconnect
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    if (socket.currentRoom) {
      handleLeaveRoom(io, socket, socket.currentRoom);
    }
  });
};

// Helper function to handle leaving a room
const handleLeaveRoom = (io, socket, roomId) => {
  const roomUsers = activeRooms.get(roomId);

  if (roomUsers && roomUsers.has(socket.userId)) {
    roomUsers.delete(socket.userId);

    // Notify others that user left
    socket.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
      userId: socket.userId,
      socketId: socket.id
    });

    // Leave socket room
    socket.leave(roomId);

    // Clean up empty rooms
    if (roomUsers.size === 0) {
      activeRooms.delete(roomId);
    }

    console.log(`User ${socket.userId} left room ${roomId}`);
  }
};

module.exports = { handleSocketEvents };
