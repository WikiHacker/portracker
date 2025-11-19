import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Logger from '../lib/logger';

const logger = new Logger('AuthContext');

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    loading: true,
    authEnabled: false,
    authenticated: false,
    setupRequired: false,
    username: null,
    requirePasswordChange: false
  });

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      });

      if (!response.ok) {
        logger.error('Failed to check auth status:', response.status);
        setAuthState({
          loading: false,
          authEnabled: false,
          authenticated: false,
          setupRequired: false,
          username: null
        });
        return;
      }

      const data = await response.json();
      
      setAuthState({
        loading: false,
        authEnabled: data.authEnabled,
        authenticated: data.authenticated,
        setupRequired: data.setupRequired,
        username: data.username,
        requirePasswordChange: data.requirePasswordChange || false
      });

      logger.debug('Auth status:', data);
    } catch (error) {
      logger.error('Error checking auth status:', error.message);
      setAuthState({
        loading: false,
        authEnabled: false,
        authenticated: false,
        setupRequired: false,
        username: null,
        requirePasswordChange: false
      });
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = useCallback(async (username, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      if (data.requirePasswordChange) {
        setAuthState(prev => ({
          ...prev,
          requirePasswordChange: true,
          authenticated: true,
          username: data.username
        }));
        return { success: true, requirePasswordChange: true };
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      await checkAuthStatus();
      return { success: true };
    } catch (error) {
      logger.error('Login error:', error.message);
      return { success: false, error: 'Network error' };
    }
  }, [checkAuthStatus]);

  const logout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        logger.error('Logout failed:', response.status);
        return;
      }

      setAuthState({
        loading: false,
        authEnabled: true,
        authenticated: false,
        setupRequired: false,
        username: null,
        requirePasswordChange: false
      });
    } catch (error) {
      logger.error('Logout error:', error.message);
    }
  }, []);

  const setup = useCallback(async (username, password) => {
    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Setup failed' };
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      await checkAuthStatus();
      return { success: true };
    } catch (error) {
      logger.error('Setup error:', error.message);
      return { success: false, error: 'Network error' };
    }
  }, [checkAuthStatus]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Password change failed' };
      }

      setAuthState(prev => ({
        ...prev,
        requirePasswordChange: false
      }));

      return { success: true };
    } catch (error) {
      logger.error('Change password error:', error.message);
      return { success: false, error: 'Network error' };
    }
  }, []);

  const value = {
    ...authState,
    login,
    logout,
    setup,
    changePassword,
    refreshAuth: checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
