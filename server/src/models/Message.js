const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emoji: {
    type: String,
    required: true,
    enum: ['👍', '❤️', '😂', '😮', '😢']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true // For private DMs
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  type: {
    type: String,
    enum: ['text', 'emoji', 'file', 'system'],
    default: 'text'
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [reactionSchema],
  fileAttachment: {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    fileName: String,
    fileSize: Number,
    fileType: String
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  // E2E encryption fields
  encrypted: {
    type: Boolean,
    default: false
  },
  iv: String, // Initialization vector for encryption
  authTag: String // Authentication tag for AES-GCM
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, recipientId: 1 });
messageSchema.index({ content: 'text' }); // Text search index

// Get messages for a room with pagination
messageSchema.statics.getRoomMessages = async function(roomId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const messages = await this.find({
    roomId,
    recipientId: null, // Room messages only (not DMs)
    isDeleted: false
  })
    .populate('senderId', 'name email avatar')
    .populate('replyTo', 'content senderId')
    .populate({
      path: 'replyTo',
      populate: {
        path: 'senderId',
        select: 'name avatar'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments({
    roomId,
    recipientId: null,
    isDeleted: false
  });

  return {
    messages: messages.reverse(), // Reverse to show oldest first
    total,
    page,
    pages: Math.ceil(total / limit),
    hasMore: skip + messages.length < total
  };
};

// Get DM messages between two users
messageSchema.statics.getDMMessages = async function(userId1, userId2, page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const messages = await this.find({
    $or: [
      { senderId: userId1, recipientId: userId2 },
      { senderId: userId2, recipientId: userId1 }
    ],
    isDeleted: false
  })
    .populate('senderId', 'name email avatar')
    .populate('replyTo', 'content senderId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments({
    $or: [
      { senderId: userId1, recipientId: userId2 },
      { senderId: userId2, recipientId: userId1 }
    ],
    isDeleted: false
  });

  return {
    messages: messages.reverse(),
    total,
    page,
    pages: Math.ceil(total / limit),
    hasMore: skip + messages.length < total
  };
};

// Search messages in a room
messageSchema.statics.searchMessages = async function(roomId, query, limit = 20) {
  return await this.find({
    roomId,
    isDeleted: false,
    $text: { $search: query }
  })
    .populate('senderId', 'name email avatar')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);
};

// Mark message as read
messageSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(
    r => r.userId.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({ userId, readAt: new Date() });
  }

  return this.save();
};

// Mark message as delivered
messageSchema.methods.markAsDelivered = function(userId) {
  const alreadyDelivered = this.deliveredTo.some(
    d => d.userId.toString() === userId.toString()
  );

  if (!alreadyDelivered) {
    this.deliveredTo.push({ userId, deliveredAt: new Date() });
  }

  return this.save();
};

// Add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  );

  // Add new reaction
  this.reactions.push({ userId, emoji });

  return this.save();
};

// Remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  );

  return this.save();
};

// Get unread count for user in room
messageSchema.statics.getUnreadCount = async function(roomId, userId) {
  return await this.countDocuments({
    roomId,
    recipientId: null,
    isDeleted: false,
    senderId: { $ne: userId },
    'readBy.userId': { $ne: userId }
  });
};

module.exports = mongoose.model('Message', messageSchema);
