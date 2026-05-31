// Shared type definitions and validators

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};

export const validateRoomId = (roomId) => {
  return roomId && typeof roomId === 'string' && roomId.length > 0;
};

export const sanitizeMessage = (message) => {
  if (!message || typeof message !== 'string') return '';
  return message.trim().slice(0, 500);
};

export const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};
