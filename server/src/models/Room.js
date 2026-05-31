const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { customAlphabet } = require('nanoid');

// Generate cryptographically secure room ID
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 12);

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['host', 'moderator', 'participant'],
    default: 'participant'
  },
  isAudioEnabled: {
    type: Boolean,
    default: true
  },
  isVideoEnabled: {
    type: Boolean,
    default: true
  },
  isMutedByHost: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'waiting', 'kicked'],
    default: 'active'
  }
});

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a room name'],
    trim: true,
    maxlength: [100, 'Room name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters'],
    default: ''
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [participantSchema],
  waitingRoom: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  kickedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    kickedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  status: {
    type: String,
    enum: ['waiting', 'active', 'ended'],
    default: 'waiting'
  },
  maxParticipants: {
    type: Number,
    default: 10,
    min: 2,
    max: 50
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    select: false // Don't return password by default
  },
  requiresApproval: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isAllMuted: {
    type: Boolean,
    default: false
  },
  settings: {
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    allowWhiteboard: {
      type: Boolean,
      default: true
    },
    allowChat: {
      type: Boolean,
      default: true
    }
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate unique room ID using nanoid (cryptographically secure)
roomSchema.statics.generateRoomId = function() {
  return nanoid();
};

// Hash password before saving
roomSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
roomSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return true; // No password set
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if room is full
roomSchema.methods.isFull = function() {
  return this.participants.length >= this.maxParticipants;
};

// Check if user is host
roomSchema.methods.isHost = function(userId) {
  return this.host.toString() === userId.toString();
};

// Check if user is moderator or host
roomSchema.methods.isModerator = function(userId) {
  if (this.isHost(userId)) return true;

  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );

  return participant && participant.role === 'moderator';
};

// Check if user is kicked
roomSchema.methods.isKicked = function(userId) {
  return this.kickedUsers.some(
    k => k.user.toString() === userId.toString()
  );
};

// Add participant to room
roomSchema.methods.addParticipant = function(userId, role = 'participant') {
  const existingParticipant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );

  if (existingParticipant) {
    return false;
  }

  this.participants.push({
    user: userId,
    role: role,
    joinedAt: new Date(),
    status: 'active'
  });

  return true;
};

// Remove participant from room
roomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    p => p.user.toString() !== userId.toString()
  );
};

// Add to waiting room
roomSchema.methods.addToWaitingRoom = function(userId) {
  const existing = this.waitingRoom.find(
    w => w.user.toString() === userId.toString()
  );

  if (existing) return false;

  this.waitingRoom.push({
    user: userId,
    requestedAt: new Date()
  });

  return true;
};

// Remove from waiting room
roomSchema.methods.removeFromWaitingRoom = function(userId) {
  this.waitingRoom = this.waitingRoom.filter(
    w => w.user.toString() !== userId.toString()
  );
};

// Approve waiting room user
roomSchema.methods.approveWaitingUser = function(userId) {
  this.removeFromWaitingRoom(userId);
  return this.addParticipant(userId);
};

// Kick user
roomSchema.methods.kickUser = function(userId, reason = '') {
  this.removeParticipant(userId);
  this.removeFromWaitingRoom(userId);

  this.kickedUsers.push({
    user: userId,
    kickedAt: new Date(),
    reason
  });
};

// Mute all participants
roomSchema.methods.muteAll = function() {
  this.isAllMuted = true;
  this.participants.forEach(p => {
    if (p.role !== 'host' && p.role !== 'moderator') {
      p.isMutedByHost = true;
    }
  });
};

// Unmute all participants
roomSchema.methods.unmuteAll = function() {
  this.isAllMuted = false;
  this.participants.forEach(p => {
    p.isMutedByHost = false;
  });
};

module.exports = mongoose.model('Room', roomSchema);
