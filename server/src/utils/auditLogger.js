const AuditLog = require('../models/AuditLog');

// Helper to extract IP address from request
const getClientIp = (req) => {
  return req.ip ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         'unknown';
};

// Helper to extract user agent
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

// Log authentication events
const logAuthEvent = async (eventType, req, userId = null, details = {}) => {
  await AuditLog.logEvent({
    eventType,
    userId,
    userName: req.user?.name || details.userName,
    userEmail: req.user?.email || details.userEmail,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    action: eventType.split('.').pop(),
    details,
    status: details.status || 'success',
    errorMessage: details.errorMessage
  });
};

// Log room events
const logRoomEvent = async (eventType, req, roomId, details = {}) => {
  await AuditLog.logEvent({
    eventType,
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    resourceId: roomId,
    resourceType: 'room',
    action: eventType.split('.').pop(),
    details,
    status: details.status || 'success'
  });
};

// Log file events
const logFileEvent = async (eventType, req, fileId, details = {}) => {
  await AuditLog.logEvent({
    eventType,
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    resourceId: fileId,
    resourceType: 'file',
    action: eventType.split('.').pop(),
    details,
    status: details.status || 'success'
  });
};

// Log suspicious activity
const logSuspiciousActivity = async (req, reason, details = {}) => {
  await AuditLog.logEvent({
    eventType: 'security.suspicious',
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    action: 'suspicious',
    details: {
      reason,
      ...details
    },
    status: 'warning'
  });
};

// Middleware to log all requests (optional - can be verbose)
const auditMiddleware = (eventType) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function(data) {
      res.send = originalSend;

      // Log after response
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';

      AuditLog.logEvent({
        eventType,
        userId: req.user?.id,
        userName: req.user?.name,
        userEmail: req.user?.email,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        action: req.method,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          body: req.body
        },
        status
      }).catch(err => console.error('Audit log error:', err));

      return res.send(data);
    };

    next();
  };
};

module.exports = {
  logAuthEvent,
  logRoomEvent,
  logFileEvent,
  logSuspiciousActivity,
  auditMiddleware,
  getClientIp,
  getUserAgent
};
