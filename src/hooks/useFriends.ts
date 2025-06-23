import { useState, useEffect, useCallback } from 'react';
import { useCgLib } from '@/contexts/CgLibContext';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/utils/authFetch';

export interface Friend {
  id: string;
  name: string;
  image?: string;
  // Database-specific fields
  friendship_status?: 'active' | 'removed' | 'blocked';
  synced_at?: string;
}

export interface FriendsState {
  friends: Friend[];
  isLoading: boolean;
  error: string | null;
  lastSyncAt: string | null;
  source: 'cg_lib' | 'database' | 'none';
}

export interface FriendsSyncResult {
  success: boolean;
  syncedCount: number;
  totalReceived: number;
  errors?: string[];
}

export function useFriends() {
  const { cgInstance, isInitializing } = useCgLib();
  const { token } = useAuth();
  
  const [state, setState] = useState<FriendsState>({
    friends: [],
    isLoading: true,
    error: null,
    lastSyncAt: null,
    source: 'none'
  });

  // Fetch friends from CG lib
  const fetchFromCgLib = useCallback(async (limit = 100, offset = 0): Promise<Friend[]> => {
    if (!cgInstance) {
      throw new Error('CG lib instance not available');
    }

    try {
      const response = await cgInstance.getUserFriends(limit, offset);
      
      // Handle different possible response structures
      const friendsData = response?.data || response || [];
      
      if (!Array.isArray(friendsData)) {
        throw new Error('Invalid response from CG lib - expected array of friends');
      }

      return friendsData.map((friend: { id: string; name: string; image?: string }) => ({
        id: friend.id,
        name: friend.name,
        image: friend.image
      }));
      
    } catch (error) {
      console.error('[useFriends] Error fetching from CG lib:', error);
      throw error;
    }
  }, [cgInstance]);

  // Fetch friends from database
  const fetchFromDatabase = useCallback(async (): Promise<Friend[]> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await authFetch('/api/me/friends', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Database fetch failed: ${response.status}`);
      }

      const data = await response.json();
      return data.friends || [];
      
    } catch (error) {
      console.error('[useFriends] Error fetching from database:', error);
      throw error;
    }
  }, [token]);

  // Sync friends to database
  const syncToDatabase = useCallback(async (friends: Friend[], clearExisting = false): Promise<FriendsSyncResult> => {
    if (!token) {
      throw new Error('Authentication required for sync');
    }

    try {
      const response = await authFetch('/api/me/friends/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          friends,
          clearExisting
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.success,
        syncedCount: result.data.syncedCount,
        totalReceived: result.data.totalReceived,
        errors: result.data.errors
      };
      
    } catch (error) {
      console.error('[useFriends] Error syncing to database:', error);
      throw error;
    }
  }, [token]);

  // Full sync: CG lib → Database
  const performFullSync = useCallback(async (): Promise<FriendsSyncResult> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Fetch from CG lib
      const cgFriends = await fetchFromCgLib();
      console.log(`[useFriends] Fetched ${cgFriends.length} friends from CG lib`);

      // 2. Sync to database
      const syncResult = await syncToDatabase(cgFriends, true); // Clear existing for full sync
      console.log(`[useFriends] Synced ${syncResult.syncedCount}/${syncResult.totalReceived} friends to database`);

      // 3. Update state with CG lib data
      setState(prev => ({
        ...prev,
        friends: cgFriends,
        isLoading: false,
        error: null,
        lastSyncAt: new Date().toISOString(),
        source: 'cg_lib'
      }));

      return syncResult;

    } catch (error) {
      console.error('[useFriends] Full sync failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Full sync failed'
      }));
      throw error;
    }
  }, [fetchFromCgLib, syncToDatabase]);

  // Load friends with fallback strategy
  const loadFriends = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Primary: Try CG lib if available
      if (cgInstance && !isInitializing) {
        try {
          const cgFriends = await fetchFromCgLib();
          
          setState(prev => ({
            ...prev,
            friends: cgFriends,
            isLoading: false,
            error: null,
            source: 'cg_lib'
          }));

          // Background sync to database (don't wait)
          syncToDatabase(cgFriends, false).catch(syncError => {
            console.warn('[useFriends] Background sync to database failed:', syncError);
          });

          return;
          
        } catch (cgError) {
          console.warn('[useFriends] CG lib fetch failed, falling back to database:', cgError);
        }
      }

      // Fallback: Try database
      if (token) {
        try {
          const dbFriends = await fetchFromDatabase();
          
          setState(prev => ({
            ...prev,
            friends: dbFriends,
            isLoading: false,
            error: null,
            source: 'database'
          }));

          return;
          
        } catch (dbError) {
          console.error('[useFriends] Database fetch also failed:', dbError);
        }
      }

      // No data available
      setState(prev => ({
        ...prev,
        friends: [],
        isLoading: false,
        error: 'No friends data available',
        source: 'none'
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load friends'
      }));
    }
  }, [cgInstance, isInitializing, token, fetchFromCgLib, fetchFromDatabase, syncToDatabase]);

  // Auto-load friends when dependencies are ready
  useEffect(() => {
    // Only auto-load if we have either CG lib or auth token
    if ((cgInstance && !isInitializing) || token) {
      loadFriends();
    }
  }, [cgInstance, isInitializing, token, loadFriends]);

  return {
    ...state,
    // Actions
    loadFriends,
    performFullSync,
    syncToDatabase,
    // Utilities
    refresh: loadFriends,
    canSync: !!(cgInstance && token),
    canLoadFromCgLib: !!(cgInstance && !isInitializing),
    canLoadFromDatabase: !!token
  };
} 