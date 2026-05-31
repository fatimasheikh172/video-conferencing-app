const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      'auth.login',
      'auth.logout',
      'auth.login.failed',
      'auth.register',
      'auth.register.failed',
      'auth.token.refresh',
      'auth.password.reset',
      'auth.password.change',
      'room.create',
      'room.join',
      'room.leave',
      'room.kick',
      'room.lock',
      'file.upload',
      'file.download',
      'file.delete',
      'user.update',
      'security.suspicious'
    ],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userName: String,
  userEmail: String,
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  resourceId: String, // Room ID, File ID, etc.
  resourceType: String, // 'room', 'file', etc.
  action: String,
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success'
  },
  errorMessage: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Index for efficient queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ eventType: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

// TTL index for automatic deletion after 30 days
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to log event
auditLogSchema.statics.logEvent = async function(eventData) {
  try {
    await this.create(eventData);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - logging failure shouldn't break the app
  }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = async function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-__v');
};

// Static method to get suspicious activity
auditLogSchema.statics.getSuspiciousActivity = async function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    $or: [
      { eventType: 'auth.login.failed' },
      { eventType: 'security.suspicious' },
      { status: 'failure' }
    ],
    createdAt: { $gte: since }
  })
  .sort({ createdAt: -1 })
  .limit(100);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
