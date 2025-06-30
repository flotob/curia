/**
 * Simplified Auth Context
 * 
 * Focused ONLY on authentication state management.
 * Business logic moved to AuthenticationService.
 * User profile and friends moved to separate contexts.
 * 
 * This replaces the massive 367-line AuthContext with a focused 50-line version.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AuthenticationService, type LoginCredentials, type AuthUser, type LoginResult } from '@/services';
import { AuthService } from '@/services/AuthService';

// Simplified auth context interface
export interface SimpleAuthContextType {
  // State
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

// Create the context
const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

// Provider props
interface SimpleAuthProviderProps {
  children: ReactNode;
}

/**
 * Simplified Auth Provider
 * 
 * Handles ONLY authentication state. Business logic delegated to AuthenticationService.
 * No friends sync, no user stats, no CG lib integration - pure authentication.
 */
export const SimpleAuthProvider: React.FC<SimpleAuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Login using AuthenticationService
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const result: LoginResult = await AuthenticationService.login(credentials);
      setToken(result.token);
      setUser(result.user);
    } catch (error) {
      console.error('[SimpleAuth] Login failed:', error);
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout and clear state
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsLoading(false);
    console.log('[SimpleAuth] Logged out');
  }, []);

  /**
   * Refresh token using AuthenticationService
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // This would need CG instance - for now, simplified version
      // In full implementation, this would delegate to AuthenticationService.refreshToken()
      console.warn('[SimpleAuth] Token refresh not yet implemented in simplified version');
      return false;
    } catch (error) {
      console.error('[SimpleAuth] Token refresh failed:', error);
      logout();
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Initialize AuthService with our functions
  useEffect(() => {
    AuthService.initialize(
      () => token,
      refreshToken,
      logout
    );
  }, [token, refreshToken, logout]);

  // Computed state
  const isAuthenticated = !!token && !!user;

  // Context value
  const value: SimpleAuthContextType = {
    token,
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

/**
 * Hook to use simplified auth context
 */
export const useSimpleAuth = (): SimpleAuthContextType => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};

// Backward compatibility export
export { useSimpleAuth as useAuth };