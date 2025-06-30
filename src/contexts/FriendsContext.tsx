/**
 * Friends Context
 * 
 * Handles friends list synchronization and management.
 * Extracted from the massive AuthContext for better separation of concerns.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ValidationError } from '@/lib/errors';
import { authFetchJson } from '@/utils/authFetch';

// Friends types
export interface Friend {
  id: string;
  name: string;
  image?: string;
}

// CG Instance interface
interface CgInstance {
  getUserFriends?: (limit: number, offset: number) => Promise<{
    data?: {
      friends?: Array<{
        id: string;
        name: string;
        imageUrl?: string;
      }>;
    };
  }>;
}

// CG Friend data structure (raw from API)
interface CgFriendData {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface FriendsSyncResult {
  totalReceived: number;
  syncedCount: number;
  errors: string[];
}

export interface FriendsContextType {
  friends: Friend[];
  isLoading: boolean;
  error: string | null;
  lastSyncAt: string | null;
  source: 'none' | 'cg_lib' | 'database';
  
  // Actions
  fetchFromCgLib: (cgInstance: CgInstance) => Promise<Friend[]>;
  syncToDatabase: (friends: Friend[], token: string) => Promise<FriendsSyncResult>;
  loadFriends: (cgInstance?: CgInstance, token?: string) => Promise<void>;
  clearFriends: () => void;
  setFriends: (friends: Friend[]) => void;
}

// Create the context
const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

// Provider props
interface FriendsProviderProps {
  children: ReactNode;
}

/**
 * Friends Provider
 * 
 * Manages friends list data and synchronization separately from authentication.
 */
export const FriendsProvider: React.FC<FriendsProviderProps> = ({ children }) => {
  const [friends, setFriendsState] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [source, setSource] = useState<'none' | 'cg_lib' | 'database'>('none');

  /**
   * Fetch friends from CG lib with pagination
   */
  const fetchFromCgLib = useCallback(async (cgInstance: CgInstance): Promise<Friend[]> => {
    if (!cgInstance) {
      throw new ValidationError('CG instance is required to fetch friends');
    }

    if (typeof cgInstance.getUserFriends !== 'function') {
      throw new ValidationError('CG instance does not support getUserFriends method');
    }

    setError(null);
    const allFriends: Friend[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 50;
    let pageCount = 0;

    try {
      while (hasMore && pageCount < 20) { // Safety limit
        pageCount++;
        
        const response = await cgInstance.getUserFriends(limit, offset);
        const friends = response?.data?.friends || [];
        
        if (friends.length === 0) {
          hasMore = false;
          break;
        }

        // Filter and clean friends data
        const cleanFriends = friends
          .filter((friend: CgFriendData) => friend.id && friend.name)
          .map((friend: CgFriendData) => ({
            id: friend.id,
            name: friend.name,
            image: friend.imageUrl,
          }));

        allFriends.push(...cleanFriends);
        offset += limit;

        // If we got fewer than requested, we've reached the end
        if (friends.length < limit) {
          hasMore = false;
        }
      }

      console.log(`[FriendsContext] Fetched ${allFriends.length} friends from CG lib across ${pageCount} pages`);
      return allFriends;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch friends from CG lib';
      console.error('[FriendsContext] Error fetching from CG lib:', err);
      throw new ValidationError(errorMessage);
    }
  }, []);

  /**
   * Sync friends to database
   */
  const syncToDatabase = useCallback(async (
    friendsList: Friend[], 
    token: string
  ): Promise<FriendsSyncResult> => {
    if (!token) {
      throw new ValidationError('Authentication token is required to sync friends');
    }

    try {
      const result = await authFetchJson<{
        syncedCount: number;
        errors: string[];
      }>('/api/me/friends/sync', {
        method: 'POST',
        token,
        body: JSON.stringify({ friends: friendsList }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return {
        totalReceived: friendsList.length,
        syncedCount: result.syncedCount || 0,
        errors: result.errors || [],
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync friends to database';
      console.error('[FriendsContext] Error syncing to database:', err);
      throw new ValidationError(errorMessage);
    }
  }, []);

  /**
   * Load friends with fallback strategy
   */
  const loadFriends = useCallback(async (cgInstance?: CgInstance, token?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Primary: Try CG lib if available
      if (cgInstance) {
        try {
          const cgFriends = await fetchFromCgLib(cgInstance);
          setFriendsState(cgFriends);
          setSource('cg_lib');
          setLastSyncAt(new Date().toISOString());

          // Background sync to database if token available
          if (token) {
            syncToDatabase(cgFriends, token).catch(syncError => {
              console.warn('[FriendsContext] Background sync to database failed:', syncError);
            });
          }

          return;
        } catch (cgError) {
          console.warn('[FriendsContext] CG lib fetch failed, falling back to database:', cgError);
        }
      }

      // Fallback: Try database if token available
      if (token) {
        try {
          const data = await authFetchJson<{
            friends: Friend[];
            lastSyncAt?: string;
          }>('/api/me/friends', {
            token,
          });

          setFriendsState(data.friends || []);
          setSource('database');
          setLastSyncAt(data.lastSyncAt || null);
          return;
        } catch (dbError) {
          console.error('[FriendsContext] Database fetch also failed:', dbError);
        }
      }

      // No data available
      setFriendsState([]);
      setSource('none');
      setError('No friends data available');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load friends';
      setError(errorMessage);
      setFriendsState([]);
      setSource('none');
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromCgLib, syncToDatabase]);

  /**
   * Clear friends data
   */
  const clearFriends = useCallback(() => {
    setFriendsState([]);
    setError(null);
    setIsLoading(false);
    setLastSyncAt(null);
    setSource('none');
  }, []);

  /**
   * Set friends directly
   */
  const setFriends = useCallback((newFriends: Friend[]) => {
    setFriendsState(newFriends);
    setError(null);
  }, []);

  // Context value
  const value: FriendsContextType = {
    friends,
    isLoading,
    error,
    lastSyncAt,
    source,
    fetchFromCgLib,
    syncToDatabase,
    loadFriends,
    clearFriends,
    setFriends,
  };

  return (
    <FriendsContext.Provider value={value}>
      {children}
    </FriendsContext.Provider>
  );
};

/**
 * Hook to use friends context
 */
export const useFriends = (): FriendsContextType => {
  const context = useContext(FriendsContext);
  if (context === undefined) {
    throw new Error('useFriends must be used within a FriendsProvider');
  }
  return context;
};