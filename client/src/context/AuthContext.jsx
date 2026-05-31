import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

export const AuthContext = createContext();

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING'
};

// Initial state
const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: true,
  error: null
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false
      };

    case AUTH_ACTIONS.REFRESH_TOKEN:
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  let refreshTokenTimeout;

  // Load user from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Verify token by fetching user
          const response = await authAPI.getMe();

          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: {
              user: response.data.user,
              accessToken: storedToken,
              refreshToken: storedRefreshToken
            }
          });

          // Start token refresh timer
          startRefreshTokenTimer(storedRefreshToken);
        } catch (error) {
          console.error('Auth initialization error:', error);
          // Token expired or invalid, try to refresh
          if (storedRefreshToken) {
            await refreshAccessToken(storedRefreshToken);
          } else {
            clearAuthData();
          }
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    initAuth();

    return () => {
      if (refreshTokenTimeout) {
        clearTimeout(refreshTokenTimeout);
      }
    };
  }, []);

  // Auto-refresh token before expiry
  const startRefreshTokenTimer = useCallback((refreshToken) => {
    if (!refreshToken) return;

    // Refresh token 1 minute before expiry (14 minutes for 15-minute token)
    const timeout = 14 * 60 * 1000; // 14 minutes

    refreshTokenTimeout = setTimeout(async () => {
      await refreshAccessToken(refreshToken);
    }, timeout);
  }, []);

  // Refresh access token
  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await authAPI.refreshToken(refreshToken);
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      // Update tokens in state
      dispatch({
        type: AUTH_ACTIONS.REFRESH_TOKEN,
        payload: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });

      // Update tokens in localStorage
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      // Start new refresh timer
      startRefreshTokenTimer(newRefreshToken);

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuthData();
      return false;
    }
  };

  // Clear auth data
  const clearAuthData = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');

    dispatch({ type: AUTH_ACTIONS.LOGOUT });

    if (refreshTokenTimeout) {
      clearTimeout(refreshTokenTimeout);
    }
  };

  // Login
  const login = async (email, password, rememberMe = false) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await authAPI.login({ email, password, rememberMe });
      const { accessToken, refreshToken, user } = response.data;

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, accessToken, refreshToken }
      });

      // Start token refresh timer
      startRefreshTokenTimer(refreshToken);

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';

      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: message
      });

      return { success: false, message };
    }
  };

  // Register
  const register = async (name, email, password, avatar = '') => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await authAPI.register({ name, email, password, avatar });
      const { accessToken, refreshToken, user } = response.data;

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, accessToken, refreshToken }
      });

      // Start token refresh timer
      startRefreshTokenTimer(refreshToken);

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      const errors = error.response?.data?.errors || [];

      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: message
      });

      return { success: false, message, errors };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
    }
  };

  // Update user
  const updateUser = (userData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });

    // Update localStorage
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...storedUser, ...userData }));
  };

  const value = {
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    updateUser,
    refreshAccessToken: () => refreshAccessToken(state.refreshToken)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
