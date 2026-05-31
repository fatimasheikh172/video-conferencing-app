import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initializeSocket = (token) => {
  // If socket exists, disconnect it first
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);

    // If authentication error, the token might be expired
    if (error.message === 'Authentication error') {
      console.log('Socket authentication failed - token may be expired');
    }
  });

  return socket;
};

export const updateSocketToken = (token) => {
  if (socket && socket.connected) {
    // Disconnect and reconnect with new token
    socket.disconnect();
    socket.auth.token = token;
    socket.connect();
    console.log('Socket token updated and reconnecting');
  }
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initializeSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

const socketService = {
  initializeSocket,
  getSocket,
  disconnectSocket,
  updateSocketToken,
};

export default socketService;
