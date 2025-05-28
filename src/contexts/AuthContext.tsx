'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import jwtDecode from 'jwt-decode'; // Utility to decode JWTs on the client-side

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
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userDataFromCgLib: {
    userId: string;
    name?: string | null;
    profilePictureUrl?: string | null;
    isAdmin?: boolean;
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
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading true

  // Effect to initialize auth state from localStorage (optional persistence)
  useEffect(() => {
    const storedToken = localStorage.getItem('plugin_jwt');
    if (storedToken) {
      try {
        const decoded = jwtDecode<AuthUser & { sub: string, adm?:boolean }>(storedToken);
        // TODO: Add token expiry check here. If expired, clear localStorage and don't set state.
        setToken(storedToken);
        setUser({
            userId: decoded.sub,
            name: decoded.name,
            picture: decoded.picture,
            isAdmin: decoded.adm || false
        });
      } catch (error) {
        console.error('Error decoding stored token:', error);
        localStorage.removeItem('plugin_jwt'); // Clear invalid token
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (userDataFromCgLib: {
    userId: string;
    name?: string | null;
    profilePictureUrl?: string | null;
    isAdmin?: boolean;
  }) => {
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch session token');
      }

      const { token: newToken } = await response.json();
      if (newToken) {
        const decoded = jwtDecode<AuthUser & { sub: string, adm?: boolean }>(newToken);
        setToken(newToken);
        setUser({
            userId: decoded.sub,
            name: decoded.name,
            picture: decoded.picture,
            isAdmin: decoded.adm || false
        });
        localStorage.setItem('plugin_jwt', newToken); // Optional: persist token
      } else {
        throw new Error('No token received from session endpoint');
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Clear any potentially inconsistent state
      setToken(null);
      setUser(null);
      localStorage.removeItem('plugin_jwt');
      throw error; // Re-throw to allow caller to handle
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('plugin_jwt'); // Clear persisted token
    // Potentially redirect or notify other parts of the app
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