// Helper function to check if JWT token is expired
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));

    // Check if token has expiration
    if (!payload.exp) return false;

    // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

// Helper to refresh token if expired
export const refreshTokenIfNeeded = async () => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (!accessToken || !refreshToken) {
    console.log('No tokens found in localStorage');
    return null;
  }

  // If access token is not expired, return it
  if (!isTokenExpired(accessToken)) {
    return accessToken;
  }

  // Access token is expired, try to refresh
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('Token refresh failed:', response.status, errorData.message);
      throw new Error(errorData.message || 'Token refresh failed');
    }

    const data = await response.json();
    const newAccessToken = data.accessToken || data.token;
    const newRefreshToken = data.refreshToken;

    if (!newAccessToken || !newRefreshToken) {
      throw new Error('Invalid token response from server');
    }

    // Update localStorage
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);

    console.log('Token refreshed successfully');
    return newAccessToken;
  } catch (error) {
    console.log('Failed to refresh token, clearing auth data:', error.message);
    // Clear invalid tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return null;
  }
};
