import api from './api';

// Upload file
export const uploadFile = async (roomId, file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('roomId', roomId);

  console.log('Uploading file:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    roomId: roomId
  });

  const config = {
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      if (onUploadProgress) {
        onUploadProgress(percentCompleted);
      }
    }
  };

  try {
    const response = await api.post('/files/upload', formData, config);
    console.log('Upload successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('File upload error details:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      data: error.response?.data
    });
    throw error;
  }
};

// Get all files in a room
export const getRoomFiles = async (roomId) => {
  const response = await api.get(`/files/room/${roomId}`);
  return response.data;
};

// Get download URL
export const getDownloadUrl = async (fileId) => {
  const response = await api.get(`/files/${fileId}/download-url`);
  return response.data;
};

// Delete file
export const deleteFile = async (fileId) => {
  const response = await api.delete(`/files/${fileId}`);
  return response.data;
};

// Download file
export const downloadFile = async (downloadUrl, filename) => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const response = await api.get(`${API_URL}${downloadUrl}`, {
    responseType: 'blob'
  });

  // Create blob link to download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Copy download link to clipboard
export const copyDownloadLink = async (fileId) => {
  const { downloadUrl } = await getDownloadUrl(fileId);
  const fullUrl = `${window.location.origin}${downloadUrl}`;
  await navigator.clipboard.writeText(fullUrl);
  return fullUrl;
};

export default {
  uploadFile,
  getRoomFiles,
  getDownloadUrl,
  deleteFile,
  downloadFile,
  copyDownloadLink
};
