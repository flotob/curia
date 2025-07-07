import { useAuthenticatedQuery } from './useAuthenticatedQuery';
import { useAuth } from '@/contexts/AuthContext';

// Types based on existing API responses
export interface ApiCommunity {
  id: string;
  name: string;
  description?: string;
  settings?: {
    logoUrl?: string;
    permissions?: {
      allowedRoles?: string[];
    };
  };
  roles?: Array<{
    id: string;
    title: string;
    type?: string;
    permissions?: string[];
  }>;
}

export interface ApiBoard {
  id: number;
  name: string;
  description?: string;
  settings?: {
    permissions?: {
      allowedRoles?: string[];
    };
    lockGating?: {
      lockIds?: number[];
      fulfillment?: 'any' | 'all';
      verificationDuration?: number;
    };
    ai?: {
      autoModeration?: {
        enabled?: boolean;
        inheritCommunitySettings?: boolean;
        enforcementLevel?: 'strict' | 'moderate' | 'lenient';
        customKnowledge?: string;
        maxKnowledgeTokens?: number;
        blockViolations?: boolean;
      };
    };
  };
  community_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch current user's community data
 * 
 * Centralized community data fetching that replaces duplicate API calls
 * across multiple components.
 */
export function useCommunityData() {
  const { user } = useAuth();
  
  return useAuthenticatedQuery<ApiCommunity>(
    ['community', user?.cid],
    `/api/communities/${user?.cid}`,
    {
      enabled: !!user?.cid,
      freshness: 'static',
      updateFrequency: 'none',
      errorMessage: 'Failed to fetch community data',
    }
  );
}

/**
 * Hook to fetch boards for current user's community
 * 
 * Centralized boards fetching with proper caching.
 */
export function useCommunityBoards() {
  const { user } = useAuth();
  
  return useAuthenticatedQuery<ApiBoard[]>(
    ['boards', user?.cid],
    `/api/communities/${user?.cid}/boards`,
    {
      enabled: !!user?.cid,
      freshness: 'dynamic',
      updateFrequency: 'slow',
      errorMessage: 'Failed to fetch community boards',
    }
  );
}

/**
 * Hook to fetch a specific community by ID
 * 
 * Useful for accessing partner communities or other community data.
 */
export function useCommunityById(communityId: string | null) {
  return useAuthenticatedQuery<ApiCommunity>(
    ['community', communityId],
    `/api/communities/${communityId}`,
    {
      enabled: !!communityId,
      freshness: 'static',
      updateFrequency: 'none',
      errorMessage: 'Failed to fetch community',
    }
  );
}

/**
 * Hook to fetch boards for a specific community
 * 
 * Useful when working with partner communities or shared boards.
 */
export function useBoardsByCommunity(communityId: string | null) {
  return useAuthenticatedQuery<ApiBoard[]>(
    ['boards', communityId],
    `/api/communities/${communityId}/boards`,
    {
      enabled: !!communityId,
      freshness: 'dynamic',
      updateFrequency: 'slow',
      errorMessage: 'Failed to fetch boards',
    }
  );
}

/**
 * Hook to fetch specific board data
 * 
 * Handles both owned and shared boards through the single board API.
 */
export function useBoard(communityId: string | null, boardId: string | null) {
  return useAuthenticatedQuery<ApiBoard>(
    ['board', communityId, boardId],
    `/api/communities/${communityId}/boards/${boardId}`,
    {
      enabled: !!communityId && !!boardId,
      freshness: 'dynamic',
      updateFrequency: 'medium',
      errorMessage: 'Failed to fetch board data',
    }
  );
}
