import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeSocket, disconnectSocket, getSocket } from '../services/socket';
import useAuthStore from '../store/authStore';
import { refreshTokenIfNeeded } from '../utils/tokenHelper';

export const SocketContext = createContext();

// Custom hook to use Socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated, setTokens, logout } = useAuthStore();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initSocket = async () => {
      if (isAuthenticated && token) {
        try {
          // Check if token is expired and refresh if needed
          const validToken = await refreshTokenIfNeeded();

          if (!validToken) {
            console.log('Token refresh failed, logging out');
            logout();
            return;
          }

          // If token was refreshed, update the store
          if (validToken !== token) {
            const newRefreshToken = localStorage.getItem('refreshToken');
            setTokens(validToken, newRefreshToken);
          }

          if (!isMounted) return;

          // Initialize socket with valid token
          const newSocket = initializeSocket(validToken);

          newSocket.on('connect', () => {
            if (isMounted) setConnected(true);
          });

          newSocket.on('disconnect', () => {
            if (isMounted) setConnected(false);
          });

          newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            if (isMounted) setConnected(false);
          });

          if (isMounted) setSocket(newSocket);
        } catch (error) {
          console.error('Error initializing socket:', error);
          logout();
        }
      } else {
        if (socket) {
          disconnectSocket();
          setSocket(null);
          setConnected(false);
        }
      }
    };

    initSocket();

    return () => {
      isMounted = false;
      disconnectSocket();
      setSocket(null);
      setConnected(false);
    };
  }, [isAuthenticated, token]);

  const value = {
    socket,
    connected,
    getSocket,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
