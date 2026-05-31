const validator = require('validator');

// Validate email
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

// Validate password strength
const isStrongPassword = (password) => {
  return password && password.length >= 6;
};

// Sanitize input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
};

// Validate room ID format
const isValidRoomId = (roomId) => {
  return /^[A-Z0-9]{8}$/.test(roomId);
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return validator.isMongoId(id);
};

module.exports = {
  isValidEmail,
  isStrongPassword,
  sanitizeInput,
  isValidRoomId,
  isValidObjectId
};
