const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { handleWebRTCEvents } = require('../socket/webrtcHandlers');
const { handleWhiteboardEvents } = require('../socket/whiteboardHandlers');
const { handleChatEvents } = require('../socket/chatHandlers');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    console.log('[Socket.io] Connection attempt from:', socket.handshake.address);
    console.log('[Socket.io] Token present:', !!token);

    if (!token) {
      console.log('[Socket.io] Authentication failed: No token provided');
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      console.log('[Socket.io] Authentication successful for user:', decoded.email);
      next();
    } catch (error) {
      console.log('[Socket.io] Authentication failed: Invalid token', error.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.userId})`);

    // Join user's personal room for DMs
    socket.join(`user:${socket.userId}`);

    // Handle WebRTC events
    handleWebRTCEvents(io, socket);

    // Handle Whiteboard events
    handleWhiteboardEvents(io, socket);

    // Handle Chat events
    handleChatEvents(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id}, Reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error: ${socket.id}`, error);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };
