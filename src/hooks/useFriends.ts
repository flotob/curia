import { useState, useEffect, useCallback } from 'react';
import { useCgLib } from '@/contexts/CgLibContext';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/utils/authFetch';
import { fetchAllFriendsFromCgLib } from '@/utils/friendsSync';

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



  // Fetch ALL friends from CG lib using pagination (shared utility)
  const fetchAllFromCgLib = useCallback(async (): Promise<Friend[]> => {
    if (!cgInstance) {
      throw new Error('CG lib instance not available');
    }

    // Use the shared utility function for consistent pagination logic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await fetchAllFriendsFromCgLib(cgInstance as any);
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

  // Full sync: CG lib → Database (with complete pagination)
  const performFullSync = useCallback(async (): Promise<FriendsSyncResult> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Fetch ALL friends from CG lib using pagination
      const cgFriends = await fetchAllFromCgLib();
      console.log(`[useFriends] Fetched ${cgFriends.length} total friends from CG lib (paginated)`);

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
  }, [fetchAllFromCgLib, syncToDatabase]);

  // Load friends with fallback strategy
  const loadFriends = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Primary: Try CG lib if available
      if (cgInstance && !isInitializing) {
        try {
          const cgFriends = await fetchAllFromCgLib();
          
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
  }, [cgInstance, isInitializing, token, fetchAllFromCgLib, fetchFromDatabase, syncToDatabase]);

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