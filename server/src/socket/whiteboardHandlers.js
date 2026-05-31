const Whiteboard = require('../models/Whiteboard');

// Store active whiteboard users and their cursor positions
const whiteboardUsers = new Map(); // roomId -> Map(userId -> { name, color, cursor })

const handleWhiteboardEvents = (io, socket) => {
  console.log(`Whiteboard Handler - User connected: ${socket.userId}`);

  // Join whiteboard room
  socket.on('whiteboard:join', ({ roomId, userName, userColor }) => {
    console.log(`User ${socket.userId} joined whiteboard in room ${roomId}`);

    socket.join(`whiteboard:${roomId}`);

    // Initialize room users map if not exists
    if (!whiteboardUsers.has(roomId)) {
      whiteboardUsers.set(roomId, new Map());
    }

    const roomUsers = whiteboardUsers.get(roomId);

    // Add user to room
    roomUsers.set(socket.userId, {
      socketId: socket.id,
      userId: socket.userId,
      userName: userName || 'Anonymous',
      userColor: userColor || '#' + Math.floor(Math.random()*16777215).toString(16),
      cursor: { x: 0, y: 0 },
      isDrawing: false
    });

    // Send current users to the new user
    const users = Array.from(roomUsers.values()).filter(u => u.userId !== socket.userId);
    socket.emit('whiteboard:users', users);

    // Notify others about new user
    socket.to(`whiteboard:${roomId}`).emit('whiteboard:user-joined', {
      userId: socket.userId,
      userName: userName || 'Anonymous',
      userColor: userColor || '#' + Math.floor(Math.random()*16777215).toString(16)
    });
  });

  // Drawing event (freehand)
  socket.on('whiteboard:draw', ({ roomId, path, userId }) => {
    console.log(`User ${userId} is drawing in room ${roomId}`);

    // Broadcast to all other users in the room
    socket.to(`whiteboard:${roomId}`).emit('whiteboard:draw', {
      path,
      userId
    });

    // Update drawing status
    const roomUsers = whiteboardUsers.get(roomId);
    if (roomUsers && roomUsers.has(userId)) {
      const user = roomUsers.get(userId);
      user.isDrawing = true;
    }
  });

  // Object added (shape, text, etc.)
  socket.on('whiteboard:object-added', ({ roomId, object, userId }) => {
    console.log(`User ${userId} added object in room ${roomId}`);

    socket.to(`whiteboard:${roomId}`).emit('whiteboard:object-added', {
      object,
      userId
    });
  });

  // Object modified (moved, resized, etc.)
  socket.on('whiteboard:object-modified', ({ roomId, object, userId }) => {
    console.log(`User ${userId} modified object in room ${roomId}`);

    socket.to(`whiteboard:${roomId}`).emit('whiteboard:object-modified', {
      object,
      userId
    });
  });

  // Object removed
  socket.on('whiteboard:object-removed', ({ roomId, objectId, userId }) => {
    console.log(`User ${userId} removed object in room ${roomId}`);

    socket.to(`whiteboard:${roomId}`).emit('whiteboard:object-removed', {
      objectId,
      userId
    });
  });

  // Clear whiteboard
  socket.on('whiteboard:clear', ({ roomId, userId }) => {
    console.log(`User ${userId} cleared whiteboard in room ${roomId}`);

    io.to(`whiteboard:${roomId}`).emit('whiteboard:clear', {
      userId
    });
  });

  // Undo action
  socket.on('whiteboard:undo', ({ roomId, userId }) => {
    console.log(`User ${userId} undo in room ${roomId}`);

    socket.to(`whiteboard:${roomId}`).emit('whiteboard:undo', {
      userId
    });
  });

  // Redo action
  socket.on('whiteboard:redo', ({ roomId, userId }) => {
    console.log(`User ${userId} redo in room ${roomId}`);

    socket.to(`whiteboard:${roomId}`).emit('whiteboard:redo', {
      userId
    });
  });

  // Cursor movement
  socket.on('whiteboard:cursor-move', ({ roomId, cursor, userId }) => {
    const roomUsers = whiteboardUsers.get(roomId);
    if (roomUsers && roomUsers.has(userId)) {
      const user = roomUsers.get(userId);
      user.cursor = cursor;

      // Broadcast cursor position to others
      socket.to(`whiteboard:${roomId}`).emit('whiteboard:cursor-move', {
        userId,
        cursor,
        userName: user.userName,
        userColor: user.userColor
      });
    }
  });

  // Drawing status (started/stopped)
  socket.on('whiteboard:drawing-status', ({ roomId, isDrawing, userId }) => {
    const roomUsers = whiteboardUsers.get(roomId);
    if (roomUsers && roomUsers.has(userId)) {
      const user = roomUsers.get(userId);
      user.isDrawing = isDrawing;

      // Broadcast drawing status
      socket.to(`whiteboard:${roomId}`).emit('whiteboard:drawing-status', {
        userId,
        userName: user.userName,
        isDrawing
      });
    }
  });

  // Save whiteboard state (auto-save)
  socket.on('whiteboard:save', async ({ roomId, canvasData, objects }) => {
    try {
      let whiteboard = await Whiteboard.findOne({ roomId });

      if (whiteboard) {
        whiteboard.canvasData = canvasData;
        whiteboard.objects = objects;
        whiteboard.version += 1;
        whiteboard.lastModifiedBy = socket.userId;
        await whiteboard.save();
      } else {
        whiteboard = await Whiteboard.create({
          roomId,
          canvasData,
          objects,
          lastModifiedBy: socket.userId
        });
      }

      console.log(`Whiteboard auto-saved for room ${roomId}, version ${whiteboard.version}`);
    } catch (error) {
      console.error('Error auto-saving whiteboard:', error);
    }
  });

  // Leave whiteboard
  socket.on('whiteboard:leave', ({ roomId }) => {
    handleLeaveWhiteboard(io, socket, roomId);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Remove user from all whiteboard rooms
    for (const [roomId, roomUsers] of whiteboardUsers.entries()) {
      if (roomUsers.has(socket.userId)) {
        handleLeaveWhiteboard(io, socket, roomId);
      }
    }
  });
};

// Helper function to handle leaving whiteboard
const handleLeaveWhiteboard = (io, socket, roomId) => {
  const roomUsers = whiteboardUsers.get(roomId);

  if (roomUsers && roomUsers.has(socket.userId)) {
    const user = roomUsers.get(socket.userId);
    roomUsers.delete(socket.userId);

    // Notify others that user left
    socket.to(`whiteboard:${roomId}`).emit('whiteboard:user-left', {
      userId: socket.userId
    });

    socket.leave(`whiteboard:${roomId}`);

    console.log(`User ${socket.userId} left whiteboard in room ${roomId}`);

    // Clean up empty rooms
    if (roomUsers.size === 0) {
      whiteboardUsers.delete(roomId);
      console.log(`Whiteboard room ${roomId} is empty and has been cleaned up`);
    }
  }
};

module.exports = {
  handleWhiteboardEvents,
  whiteboardUsers
};
