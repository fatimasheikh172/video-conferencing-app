const Room = require('../models/Room');
const User = require('../models/User');

// Store active rooms and their socket connections
const activeRooms = new Map();
const MAX_PARTICIPANTS = 6;

const handleWebRTCEvents = (io, socket) => {
  console.log(`WebRTC Handler - User connected: ${socket.userId}`);

  // Join room
  socket.on('room:join', async ({ roomId, userName }) => {
    try {
      console.log(`User ${socket.userId} attempting to join room ${roomId}`);

      // Check if room exists
      const room = await Room.findOne({ roomId }).populate('participants.user', 'name email avatar');

      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      // Check if user is a participant in the database
      const isParticipant = room.participants.some(
        p => p.user._id.toString() === socket.userId
      );

      if (!isParticipant) {
        // User not in database, try to add them
        const added = room.addParticipant(socket.userId);

        if (!added) {
          socket.emit('room:error', { message: 'Failed to join room. Please try again.' });
          return;
        }

        await room.save();
        console.log(`Added user ${socket.userId} to room ${roomId} in database`);
      }

      // Initialize room in activeRooms if not exists
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
      }

      const roomUsers = activeRooms.get(roomId);

      // Check max participants
      if (roomUsers.size >= MAX_PARTICIPANTS) {
        socket.emit('room:error', { message: 'Room is full (max 6 participants)' });
        return;
      }

      // Join socket room
      socket.join(roomId);
      socket.currentRoom = roomId;

      // Store user info
      const userInfo = {
        socketId: socket.id,
        userId: socket.userId,
        userName: userName || socket.userEmail,
        isAudioEnabled: true,
        isVideoEnabled: true,
        joinedAt: Date.now(),
        connectionQuality: 'good'
      };

      roomUsers.set(socket.userId, userInfo);

      // Get all users in room (except the one joining)
      const existingUsers = Array.from(roomUsers.values()).filter(
        u => u.userId !== socket.userId
      );

      // Send existing users to the new user
      socket.emit('room:users', existingUsers);

      // Notify others that a new user joined
      socket.to(roomId).emit('user:joined', {
        userId: socket.userId,
        userName: userInfo.userName,
        socketId: socket.id,
        isAudioEnabled: true,
        isVideoEnabled: true
      });

      console.log(`User ${socket.userId} joined room ${roomId}. Total users: ${roomUsers.size}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('room:error', { message: 'Failed to join room' });
    }
  });

  // Leave room
  socket.on('room:leave', ({ roomId }) => {
    handleLeaveRoom(io, socket, roomId);
  });

  // WebRTC Signaling - Send signal to specific peer
  socket.on('peer:signal', ({ signal, to, userId }) => {
    console.log(`Signaling from ${socket.id} to ${to}`);
    io.to(to).emit('peer:signal', {
      signal,
      from: socket.id,
      userId: socket.userId
    });
  });

  // Peer connection established
  socket.on('peer:connected', ({ peerId, roomId }) => {
    console.log(`Peer connected: ${socket.id} <-> ${peerId}`);
    socket.to(roomId).emit('peer:connected', {
      userId: socket.userId,
      peerId
    });
  });

  // Peer disconnected
  socket.on('peer:disconnected', ({ peerId, roomId }) => {
    console.log(`Peer disconnected: ${peerId}`);
    socket.to(roomId).emit('peer:disconnected', {
      userId: socket.userId,
      peerId
    });
  });

  // Toggle audio
  socket.on('user:toggle-audio', ({ roomId, isEnabled }) => {
    const roomUsers = activeRooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.userId)) {
      const user = roomUsers.get(socket.userId);
      user.isAudioEnabled = isEnabled;

      socket.to(roomId).emit('user:media-state', {
        userId: socket.userId,
        isAudioEnabled: isEnabled,
        isVideoEnabled: user.isVideoEnabled
      });

      console.log(`User ${socket.userId} audio: ${isEnabled}`);
    }
  });

  // Toggle video
  socket.on('user:toggle-video', ({ roomId, isEnabled }) => {
    const roomUsers = activeRooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.userId)) {
      const user = roomUsers.get(socket.userId);
      user.isVideoEnabled = isEnabled;

      socket.to(roomId).emit('user:media-state', {
        userId: socket.userId,
        isAudioEnabled: user.isAudioEnabled,
        isVideoEnabled: isEnabled
      });

      console.log(`User ${socket.userId} video: ${isEnabled}`);
    }
  });

  // Connection quality update
  socket.on('connection:quality', ({ roomId, quality }) => {
    const roomUsers = activeRooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.userId)) {
      const user = roomUsers.get(socket.userId);
      user.connectionQuality = quality;

      socket.to(roomId).emit('user:quality-changed', {
        userId: socket.userId,
        quality
      });
    }
  });

  // Screen share start
  socket.on('screenshare:start', ({ roomId }) => {
    const roomUsers = activeRooms.get(roomId);
    if (!roomUsers) return;

    // Check if someone else is already sharing
    const currentSharer = Array.from(roomUsers.values()).find(u => u.isScreenSharing);

    if (currentSharer && currentSharer.userId !== socket.userId) {
      socket.emit('screenshare:error', {
        message: `${currentSharer.userName} is already sharing their screen`
      });
      return;
    }

    // Mark user as screen sharing
    const user = roomUsers.get(socket.userId);
    if (user) {
      user.isScreenSharing = true;

      // Notify all users in the room
      io.to(roomId).emit('screenshare:started', {
        userId: socket.userId,
        userName: user.userName
      });

      console.log(`User ${socket.userId} started screen sharing in room ${roomId}`);
    }
  });

  // Screen share stop
  socket.on('screenshare:stop', ({ roomId }) => {
    const roomUsers = activeRooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.userId)) {
      const user = roomUsers.get(socket.userId);
      user.isScreenSharing = false;

      // Notify all users in the room
      io.to(roomId).emit('screenshare:stopped', {
        userId: socket.userId
      });

      console.log(`User ${socket.userId} stopped screen sharing in room ${roomId}`);
    }
  });

  // Screen share request (when someone wants to share but another is sharing)
  socket.on('screenshare:request', ({ roomId }) => {
    const roomUsers = activeRooms.get(roomId);
    if (!roomUsers) return;

    const currentSharer = Array.from(roomUsers.values()).find(u => u.isScreenSharing);

    if (currentSharer) {
      // Notify the current sharer that someone wants to share
      io.to(currentSharer.socketId).emit('screenshare:request-received', {
        userId: socket.userId,
        userName: roomUsers.get(socket.userId)?.userName
      });

      console.log(`User ${socket.userId} requested to share screen in room ${roomId}`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    if (socket.currentRoom) {
      handleLeaveRoom(io, socket, socket.currentRoom);
    }
  });

  // Reconnection attempt
  socket.on('room:reconnect', async ({ roomId, userName }) => {
    console.log(`User ${socket.userId} attempting to reconnect to room ${roomId}`);

    const roomUsers = activeRooms.get(roomId);
    if (roomUsers) {
      // Update socket ID for reconnected user
      const userInfo = roomUsers.get(socket.userId);
      if (userInfo) {
        userInfo.socketId = socket.id;
        socket.join(roomId);
        socket.currentRoom = roomId;

        // Notify others about reconnection
        socket.to(roomId).emit('user:reconnected', {
          userId: socket.userId,
          socketId: socket.id
        });

        // Send current room state to reconnected user
        const existingUsers = Array.from(roomUsers.values()).filter(
          u => u.userId !== socket.userId
        );
        socket.emit('room:users', existingUsers);
      }
    }
  });
};

// Helper function to handle leaving a room
const handleLeaveRoom = (io, socket, roomId) => {
  const roomUsers = activeRooms.get(roomId);

  if (roomUsers && roomUsers.has(socket.userId)) {
    roomUsers.delete(socket.userId);

    // Notify others that user left
    socket.to(roomId).emit('user:left', {
      userId: socket.userId,
      socketId: socket.id
    });

    // Leave socket room
    socket.leave(roomId);

    console.log(`User ${socket.userId} left room ${roomId}. Remaining: ${roomUsers.size}`);

    // Clean up empty rooms
    if (roomUsers.size === 0) {
      activeRooms.delete(roomId);
      console.log(`Room ${roomId} is empty and has been cleaned up`);

      // Update room status in database
      Room.findOneAndUpdate(
        { roomId },
        { status: 'ended', endedAt: new Date() }
      ).catch(err => console.error('Error updating room status:', err));
    }
  }
};

// Get room info
const getRoomInfo = (roomId) => {
  const roomUsers = activeRooms.get(roomId);
  if (!roomUsers) return null;

  return {
    roomId,
    participants: Array.from(roomUsers.values()),
    participantCount: roomUsers.size,
    maxParticipants: MAX_PARTICIPANTS
  };
};

module.exports = {
  handleWebRTCEvents,
  getRoomInfo,
  activeRooms
};
