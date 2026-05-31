const Message = require('../models/Message');
const Room = require('../models/Room');

// Store typing users per room
const typingUsers = new Map(); // roomId -> Set of userIds

const handleChatEvents = (io, socket) => {
  // Send message (real-time)
  socket.on('message:send', async ({ roomId, recipientId, content, type, replyTo, encrypted, iv, authTag }) => {
    try {
      // Validate room or recipient
      if (roomId) {
        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const isParticipant = room.participants.some(
          p => p.user.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'You are not a member of this room' });
          return;
        }
      }

      // Create message
      const message = await Message.create({
        roomId: roomId || null,
        senderId: socket.userId,
        recipientId: recipientId || null,
        content,
        type: type || 'text',
        replyTo: replyTo || null,
        encrypted: encrypted || false,
        iv: iv || null,
        authTag: authTag || null
      });

      // Populate sender info
      await message.populate('senderId', 'name email avatar');
      if (replyTo) {
        await message.populate({
          path: 'replyTo',
          select: 'content senderId',
          populate: {
            path: 'senderId',
            select: 'name avatar'
          }
        });
      }

      const messageData = {
        id: message._id,
        roomId: message.roomId,
        recipientId: message.recipientId,
        sender: {
          id: message.senderId._id,
          name: message.senderId.name,
          avatar: message.senderId.avatar
        },
        content: message.content,
        type: message.type,
        replyTo: message.replyTo,
        reactions: message.reactions,
        encrypted: message.encrypted,
        iv: message.iv,
        authTag: message.authTag,
        createdAt: message.createdAt
      };

      // Emit to room or recipient
      if (roomId) {
        io.to(roomId).emit('message:received', { message: messageData });
      } else if (recipientId) {
        // DM - emit to recipient
        io.to(`user:${recipientId}`).emit('message:received', { message: messageData });
        // Also emit to sender for confirmation
        socket.emit('message:received', { message: messageData });
      }

      // Mark as delivered for online users
      if (roomId) {
        const roomSockets = await io.in(roomId).fetchSockets();
        for (const s of roomSockets) {
          if (s.userId !== socket.userId) {
            await message.markAsDelivered(s.userId);
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Edit message
  socket.on('message:edit', async ({ messageId, content }) => {
    try {
      const message = await Message.findById(messageId);

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check if user is the sender
      if (message.senderId.toString() !== socket.userId) {
        socket.emit('error', { message: 'You can only edit your own messages' });
        return;
      }

      if (message.isDeleted) {
        socket.emit('error', { message: 'Cannot edit deleted message' });
        return;
      }

      // Update message
      message.content = content;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      // Emit to room or recipient
      const target = message.roomId || `user:${message.recipientId}`;
      io.to(target).emit('message:edited', {
        messageId: message._id,
        content: message.content,
        editedAt: message.editedAt
      });

    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

  // Delete message
  socket.on('message:delete', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check if user is the sender
      if (message.senderId.toString() !== socket.userId) {
        socket.emit('error', { message: 'You can only delete your own messages' });
        return;
      }

      // Soft delete
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      // Emit to room or recipient
      const target = message.roomId || `user:${message.recipientId}`;
      io.to(target).emit('message:deleted', {
        messageId: message._id
      });

    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // React to message
  socket.on('message:react', async ({ messageId, emoji }) => {
    try {
      const message = await Message.findById(messageId);

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Add or update reaction
      await message.addReaction(socket.userId, emoji);

      // Emit to room or recipient
      const target = message.roomId || `user:${message.recipientId}`;
      io.to(target).emit('message:reacted', {
        messageId: message._id,
        userId: socket.userId,
        emoji,
        reactions: message.reactions
      });

    } catch (error) {
      console.error('Error reacting to message:', error);
      socket.emit('error', { message: 'Failed to react to message' });
    }
  });

  // Remove reaction
  socket.on('message:unreact', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Remove reaction
      await message.removeReaction(socket.userId);

      // Emit to room or recipient
      const target = message.roomId || `user:${message.recipientId}`;
      io.to(target).emit('message:reaction-removed', {
        messageId: message._id,
        userId: socket.userId,
        reactions: message.reactions
      });

    } catch (error) {
      console.error('Error removing reaction:', error);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  });

  // Mark message as read
  socket.on('message:read', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);

      if (!message) {
        return;
      }

      await message.markAsRead(socket.userId);

      // Emit to sender
      io.to(`user:${message.senderId}`).emit('message:read', {
        messageId: message._id,
        userId: socket.userId,
        readAt: new Date()
      });

    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  // Typing indicator - start
  socket.on('typing:start', ({ roomId, recipientId }) => {
    const target = roomId || `user:${recipientId}`;

    if (roomId) {
      // Add to typing users set
      if (!typingUsers.has(roomId)) {
        typingUsers.set(roomId, new Set());
      }
      typingUsers.get(roomId).add(socket.userId);
    }

    // Emit to room or recipient (exclude sender)
    socket.to(target).emit('typing:start', {
      userId: socket.userId,
      userName: socket.userName || socket.userEmail,
      roomId,
      recipientId
    });
  });

  // Typing indicator - stop
  socket.on('typing:stop', ({ roomId, recipientId }) => {
    const target = roomId || `user:${recipientId}`;

    if (roomId && typingUsers.has(roomId)) {
      typingUsers.get(roomId).delete(socket.userId);

      // Clean up empty sets
      if (typingUsers.get(roomId).size === 0) {
        typingUsers.delete(roomId);
      }
    }

    // Emit to room or recipient (exclude sender)
    socket.to(target).emit('typing:stop', {
      userId: socket.userId,
      roomId,
      recipientId
    });
  });

  // Mark all messages in room as read
  socket.on('messages:mark-all-read', async ({ roomId }) => {
    try {
      const messages = await Message.find({
        roomId,
        senderId: { $ne: socket.userId },
        'readBy.userId': { $ne: socket.userId }
      });

      for (const message of messages) {
        await message.markAsRead(socket.userId);

        // Notify sender
        io.to(`user:${message.senderId}`).emit('message:read', {
          messageId: message._id,
          userId: socket.userId,
          readAt: new Date()
        });
      }

    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  });

  // Handle disconnect - clear typing indicators
  socket.on('disconnect', () => {
    // Remove from all typing indicators
    for (const [roomId, users] of typingUsers.entries()) {
      if (users.has(socket.userId)) {
        users.delete(socket.userId);

        // Notify room
        io.to(roomId).emit('typing:stop', {
          userId: socket.userId,
          roomId
        });

        // Clean up empty sets
        if (users.size === 0) {
          typingUsers.delete(roomId);
        }
      }
    }
  });
};

module.exports = { handleChatEvents };
