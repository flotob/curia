'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode'; // Utility to decode JWTs on the client-side

// Define the shape of the user object derived from the JWT
interface AuthUser {
  userId: string; // from jwt 'sub'
  name?: string | null;
  picture?: string | null;
  isAdmin?: boolean;
}

// Define the shape of the AuthContext
interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean; // Will now primarily reflect in-flight login(), not initial load from storage
  isAuthenticated: boolean;
  login: (userDataFromCgLib: {
    userId: string;
    name?: string | null;
    profilePictureUrl?: string | null;
    isAdmin?: boolean;
    iframeUid?: string | null;
    communityId?: string | null;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  // isLoading can now be primarily for the login() async operation itself
  // Or, we can set it to false initially if there's no async loading from storage
  const [isLoading, setIsLoading] = useState<boolean>(false); 

  // Removed useEffect that loaded token from localStorage
  // The component will now start with token: null, user: null, isLoading: false (or true until first actual login attempt)

  const login = async (userDataFromCgLib: {
    userId: string;
    name?: string | null;
    profilePictureUrl?: string | null;
    isAdmin?: boolean;
    iframeUid?: string | null; 
    communityId?: string | null; 
  }) => {
    console.log('[AuthContext] LOGIN FUNCTION ENTERED. isAdmin from input:', userDataFromCgLib.isAdmin, 'Full data:', JSON.stringify(userDataFromCgLib));
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: userDataFromCgLib.userId,
            name: userDataFromCgLib.name,
            profilePictureUrl: userDataFromCgLib.profilePictureUrl,
            isAdmin: userDataFromCgLib.isAdmin,
            iframeUid: userDataFromCgLib.iframeUid,       
            communityId: userDataFromCgLib.communityId,   
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthContext] Fetch session token failed:', errorData);
        throw new Error(errorData.error || 'Failed to fetch session token');
      }

      const { token: newToken } = await response.json();
      if (newToken) {
        const decoded = jwtDecode<AuthUser & { sub: string, adm?: boolean, exp?: number, uid?: string, cid?: string }>(newToken);
        console.log('[AuthContext] New token received. Decoded expiry (exp):', decoded.exp, 'Current time:', Math.floor(Date.now() / 1000));
        // No need to check expiry here as it's a fresh token
        setToken(newToken);
        setUser({
            userId: decoded.sub,
            name: decoded.name,
            picture: decoded.picture,
            isAdmin: decoded.adm || false
        });
        // Removed localStorage.setItem('plugin_jwt', newToken);
      } else {
        throw new Error('No token received from session endpoint');
      }
    } catch (error) {
      console.error('Login failed overall:', error);
      setToken(null);
      setUser(null);
      // Removed localStorage.removeItem('plugin_jwt');
      throw error; 
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    // Removed localStorage.removeItem('plugin_jwt'); 
    setIsLoading(false); // Reset loading state on logout
    console.log('[AuthContext] Logged out, token and user cleared.');
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ token, user, isLoading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 