/**
 * User Profile Context
 * 
 * Handles user profile data and statistics.
 * Extracted from the massive AuthContext for better separation of concerns.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ValidationError } from '@/lib/errors';

// User profile types
export interface UserStats {
  postCount: number;
  commentCount: number;
  isNewUser: boolean;
}

export interface UserProfile {
  userId: string;
  name?: string | null;
  picture?: string | null;
  communityShortId?: string | null;
  pluginId?: string | null;
  previousVisit?: string | null;
  stats?: UserStats;
}

export interface UserProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfile>) => void;
  refreshStats: () => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
  clearProfile: () => void;
}

// Create the context
const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// Provider props
interface UserProfileProviderProps {
  children: ReactNode;
}

/**
 * User Profile Provider
 * 
 * Manages user profile data and statistics separately from authentication.
 */
export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update user profile with partial data
   */
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfileState(prevProfile => {
      if (!prevProfile) {
        console.warn('[UserProfile] Cannot update profile: no profile exists');
        return null;
      }
      
      return {
        ...prevProfile,
        ...updates,
      };
    });
  }, []);

  /**
   * Refresh user statistics from API
   */
  const refreshStats = useCallback(async () => {
    if (!profile?.userId) {
      throw new ValidationError('Cannot refresh stats: no user profile available');
    }

    setIsLoading(true);
    setError(null);

    try {
      // This would normally require a token, but for now we'll implement a basic version
      const response = await fetch('/api/me');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user stats: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.stats) {
        updateProfile({ stats: data.stats });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh user stats';
      setError(errorMessage);
      console.error('[UserProfile] Failed to refresh stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.userId, updateProfile]);

  /**
   * Set complete user profile
   */
  const setProfile = useCallback((newProfile: UserProfile | null) => {
    setProfileState(newProfile);
    setError(null);
  }, []);

  /**
   * Clear user profile
   */
  const clearProfile = useCallback(() => {
    setProfileState(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Context value
  const value: UserProfileContextType = {
    profile,
    isLoading,
    error,
    updateProfile,
    refreshStats,
    setProfile,
    clearProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

/**
 * Hook to use user profile context
 */
export const useUserProfile = (): UserProfileContextType => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};