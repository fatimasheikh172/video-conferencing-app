import api from './api';

// Get room messages
export const getRoomMessages = async (roomId, page = 1, limit = 50) => {
  const response = await api.get(`/chat/room/${roomId}`, {
    params: { page, limit }
  });
  return response.data;
};

// Get DM messages
export const getDMMessages = async (userId, page = 1, limit = 50) => {
  const response = await api.get(`/chat/dm/${userId}`, {
    params: { page, limit }
  });
  return response.data;
};

// Send message
export const sendMessage = async (messageData) => {
  const response = await api.post('/chat/send', messageData);
  return response.data;
};

// Edit message
export const editMessage = async (messageId, content) => {
  const response = await api.put(`/chat/${messageId}`, { content });
  return response.data;
};

// Delete message
export const deleteMessage = async (messageId) => {
  const response = await api.delete(`/chat/${messageId}`);
  return response.data;
};

// React to message
export const reactToMessage = async (messageId, emoji) => {
  const response = await api.post(`/chat/${messageId}/react`, { emoji });
  return response.data;
};

// Remove reaction
export const removeReaction = async (messageId) => {
  const response = await api.delete(`/chat/${messageId}/react`);
  return response.data;
};

// Mark message as read
export const markAsRead = async (messageId) => {
  const response = await api.post(`/chat/${messageId}/read`);
  return response.data;
};

// Search messages
export const searchMessages = async (roomId, query, limit = 20) => {
  const response = await api.get(`/chat/room/${roomId}/search`, {
    params: { q: query, limit }
  });
  return response.data;
};

// Get unread count
export const getUnreadCount = async (roomId) => {
  const response = await api.get(`/chat/room/${roomId}/unread`);
  return response.data;
};

const chatApi = {
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

export default chatApi;
