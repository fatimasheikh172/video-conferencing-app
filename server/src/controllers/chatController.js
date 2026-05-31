const Message = require('../models/Message');
const Room = require('../models/Room');
const { logRoomEvent } = require('../utils/auditLogger');

// @desc    Get room messages with pagination
// @route   GET /api/chat/room/:roomId
// @access  Private
const getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if room exists and user is participant
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }

    const result = await Message.getRoomMessages(roomId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get DM messages between two users
// @route   GET /api/chat/dm/:userId
// @access  Private
const getDMMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await Message.getDMMessages(
      req.user.id,
      userId,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message
// @route   POST /api/chat/send
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const {
      roomId,
      recipientId,
      content,
      type = 'text',
      replyTo,
      fileAttachment,
      encrypted = false,
      iv,
      authTag
    } = req.body;

    // Validate room or recipient
    if (roomId) {
      const room = await Room.findOne({ roomId });
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const isParticipant = room.participants.some(
        p => p.user.toString() === req.user.id
      );

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this room'
        });
      }
    }

    // Create message
    const message = await Message.create({
      roomId: roomId || null,
      senderId: req.user.id,
      recipientId: recipientId || null,
      content,
      type,
      replyTo: replyTo || null,
      fileAttachment: fileAttachment || null,
      encrypted,
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

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      if (roomId) {
        // Room message
        io.to(roomId).emit('message:received', {
          message: {
            id: message._id,
            roomId: message.roomId,
            sender: {
              id: message.senderId._id,
              name: message.senderId.name,
              avatar: message.senderId.avatar
            },
            content: message.content,
            type: message.type,
            replyTo: message.replyTo,
            reactions: message.reactions,
            fileAttachment: message.fileAttachment,
            encrypted: message.encrypted,
            iv: message.iv,
            authTag: message.authTag,
            createdAt: message.createdAt
          }
        });
      } else if (recipientId) {
        // DM - emit to both sender and recipient
        io.to(`user:${recipientId}`).emit('message:received', {
          message: {
            id: message._id,
            sender: {
              id: message.senderId._id,
              name: message.senderId.name,
              avatar: message.senderId.avatar
            },
            recipientId: message.recipientId,
            content: message.content,
            type: message.type,
            replyTo: message.replyTo,
            encrypted: message.encrypted,
            iv: message.iv,
            authTag: message.authTag,
            createdAt: message.createdAt
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit message
// @route   PUT /api/chat/:messageId
// @access  Private
const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Check if message is already deleted
    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit deleted message'
      });
    }

    // Update message
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const target = message.roomId || `user:${message.recipientId}`;
      io.to(target).emit('message:edited', {
        messageId: message._id,
        content: message.content,
        editedAt: message.editedAt
      });
    }

    res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message
// @route   DELETE /api/chat/:messageId
// @access  Private
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const target = message.roomId || `user:${message.recipientId}`;
      io.to(target).emit('message:deleted', {
        messageId: message._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    React to message
// @route   POST /api/chat/:messageId/react
// @access  Private
const reactToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Add or update reaction
    await message.addReaction(req.user.id, emoji);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const target = message.roomId || `user:${message.recipientId}`;
      io.to(target).emit('message:reacted', {
        messageId: message._id,
        userId: req.user.id,
        emoji,
        reactions: message.reactions
      });
    }

    res.status(200).json({
      success: true,
      reactions: message.reactions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove reaction from message
// @route   DELETE /api/chat/:messageId/react
// @access  Private
const removeReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Remove reaction
    await message.removeReaction(req.user.id);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const target = message.roomId || `user:${message.recipientId}`;
      io.to(target).emit('message:reaction-removed', {
        messageId: message._id,
        userId: req.user.id,
        reactions: message.reactions
      });
    }

    res.status(200).json({
      success: true,
      reactions: message.reactions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark message as read
// @route   POST /api/chat/:messageId/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.markAsRead(req.user.id);

    // Emit socket event to sender
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${message.senderId}`).emit('message:read', {
        messageId: message._id,
        userId: req.user.id,
        readAt: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search messages in room
// @route   GET /api/chat/room/:roomId/search
// @access  Private
const searchMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Check if room exists and user is participant
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }

    const messages = await Message.searchMessages(roomId, q, parseInt(limit));

    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread message count
// @route   GET /api/chat/room/:roomId/unread
// @access  Private
const getUnreadCount = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    const count = await Message.getUnreadCount(roomId, req.user.id);

    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
