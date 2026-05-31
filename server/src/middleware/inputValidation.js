const Joi = require('joi');
const { logSuspiciousActivity } = require('../utils/auditLogger');

// Sanitize string input
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  // Remove null bytes
  str = str.replace(/\0/g, '');

  // Trim whitespace
  str = str.trim();

  // Remove control characters except newlines and tabs
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return str;
};

// Validation schemas
const schemas = {
  // Auth schemas
  register: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z0-9\s\-_]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Name can only contain letters, numbers, spaces, hyphens, and underscores'
      }),
    email: Joi.string()
      .email()
      .max(100)
      .lowercase()
      .required(),
    password: Joi.string()
      .min(8)
      .max(128)
      .required()
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .max(100)
      .lowercase()
      .required(),
    password: Joi.string()
      .min(8)
      .max(128)
      .required(),
    rememberMe: Joi.boolean().optional()
  }),

  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .max(100)
      .lowercase()
      .required()
  }),

  resetPassword: Joi.object({
    password: Joi.string()
      .min(8)
      .max(128)
      .required(),
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords must match'
      })
  }),

  // Room schemas
  createRoom: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required(),
    description: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    maxParticipants: Joi.number()
      .integer()
      .min(2)
      .max(50)
      .default(10),
    isPrivate: Joi.boolean()
      .default(false),
    password: Joi.string()
      .min(4)
      .max(50)
      .optional()
      .allow(''),
    requiresApproval: Joi.boolean()
      .default(false),
    isLocked: Joi.boolean()
      .default(false)
  }),

  updateRoom: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .optional(),
    description: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    maxParticipants: Joi.number()
      .integer()
      .min(2)
      .max(50)
      .optional(),
    isPrivate: Joi.boolean()
      .optional(),
    password: Joi.string()
      .min(4)
      .max(50)
      .optional()
      .allow(''),
    requiresApproval: Joi.boolean()
      .optional(),
    isLocked: Joi.boolean()
      .optional()
  }),

  joinRoom: Joi.object({
    password: Joi.string()
      .max(50)
      .optional()
      .allow('')
  }),

  // File schemas
  fileUpload: Joi.object({
    roomId: Joi.string()
      .pattern(/^[a-zA-Z0-9\-_]+$/)
      .required()
  }),

  // Message schemas
  sendMessage: Joi.object({
    roomId: Joi.string()
      .pattern(/^[a-zA-Z0-9\-_]+$/)
      .required(),
    content: Joi.string()
      .min(1)
      .max(5000)
      .required(),
    encrypted: Joi.boolean()
      .default(false),
    iv: Joi.string()
      .optional(),
    authTag: Joi.string()
      .optional()
  }),

  // Message schemas
  sendMessage: Joi.object({
    roomId: Joi.string()
      .pattern(/^[a-zA-Z0-9\-_]+$/)
      .optional()
      .allow(''),
    recipientId: Joi.string()
      .pattern(/^[a-f0-9]{24}$/)
      .optional()
      .allow(''),
    content: Joi.string()
      .min(1)
      .max(5000)
      .required(),
    type: Joi.string()
      .valid('text', 'emoji', 'file', 'system')
      .default('text'),
    replyTo: Joi.string()
      .pattern(/^[a-f0-9]{24}$/)
      .optional()
      .allow(''),
    fileAttachment: Joi.object({
      fileId: Joi.string().pattern(/^[a-f0-9]{24}$/),
      fileName: Joi.string().max(255),
      fileSize: Joi.number().positive(),
      fileType: Joi.string().max(100)
    }).optional(),
    encrypted: Joi.boolean()
      .default(false),
    iv: Joi.string()
      .optional()
      .allow(''),
    authTag: Joi.string()
      .optional()
      .allow('')
  }).or('roomId', 'recipientId'),

  // User update schemas
  updateProfile: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z0-9\s\-_]+$/)
      .optional(),
    bio: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    avatar: Joi.string()
      .uri()
      .optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string()
      .min(8)
      .max(128)
      .required(),
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .required(),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
  }),

  // Whiteboard schemas
  saveWhiteboard: Joi.object({
    canvasData: Joi.object().required(),
    objects: Joi.array().required()
  })
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      return res.status(500).json({
        success: false,
        message: 'Validation schema not found'
      });
    }

    // Sanitize string inputs
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = sanitizeString(req.body[key]);
        }
      });
    }

    // Validate
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      // Log suspicious validation failures
      if (errors.some(e => e.message.includes('pattern') || e.message.includes('invalid'))) {
        logSuspiciousActivity(req, 'Validation failed - suspicious input', {
          schema: schemaName,
          errors
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace body with validated and sanitized value
    req.body = value;
    next();
  };
};

// Custom validators
const validateRoomId = (req, res, next) => {
  const { roomId } = req.params;

  if (!roomId || !/^[a-zA-Z0-9\-_]+$/.test(roomId)) {
    logSuspiciousActivity(req, 'Invalid room ID format', { roomId });
    return res.status(400).json({
      success: false,
      message: 'Invalid room ID format'
    });
  }

  next();
};

const validateFileId = (req, res, next) => {
  const { fileId } = req.params;

  if (!fileId || !/^[a-f0-9]{24}$/.test(fileId)) {
    logSuspiciousActivity(req, 'Invalid file ID format', { fileId });
    return res.status(400).json({
      success: false,
      message: 'Invalid file ID format'
    });
  }

  next();
};

const validateUserId = (req, res, next) => {
  const { userId } = req.params;

  if (!userId || !/^[a-f0-9]{24}$/.test(userId)) {
    logSuspiciousActivity(req, 'Invalid user ID format', { userId });
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }

  next();
};

module.exports = {
  validate,
  validateRoomId,
  validateFileId,
  validateUserId,
  sanitizeString,
  schemas
};
