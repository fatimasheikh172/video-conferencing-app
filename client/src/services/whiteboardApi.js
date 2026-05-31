import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with auth token
const getAuthConfig = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// Get whiteboard state
export const getWhiteboardState = async (roomId) => {
  const response = await axios.get(
    `${API_URL}/whiteboard/${roomId}`,
    getAuthConfig()
  );
  return response.data;
};

// Save whiteboard state
export const saveWhiteboardState = async (roomId, canvasData, objects) => {
  const response = await axios.post(
    `${API_URL}/whiteboard/${roomId}/save`,
    { canvasData, objects },
    getAuthConfig()
  );
  return response.data;
};

// Clear whiteboard
export const clearWhiteboard = async (roomId) => {
  const response = await axios.post(
    `${API_URL}/whiteboard/${roomId}/clear`,
    {},
    getAuthConfig()
  );
  return response.data;
};

export default {
  getWhiteboardState,
  saveWhiteboardState,
  clearWhiteboard
};
